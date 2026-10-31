#!/usr/bin/env python3
"""NOVA Model Gateway - Flask service for model inference with per-user quotas and cost accounting."""

import os
import re
import time
import json
import yaml
import logging
import threading
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
from functools import wraps
from collections import defaultdict

from flask import Flask, request, jsonify, Response

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Default configuration
DEFAULT_REGISTRY_PATH = Path(__file__).parent.parent.parent.parent / "models" / "model-registry.yaml"
DEFAULT_NUM_CTX = 4096
DEFAULT_TIMEOUT = 30
DEFAULT_QUOTA = "60/minute"  # 60 requests per minute per tier


@dataclass
class ModelConfig:
    """Configuration for a single model."""
    id: str
    provider: str
    tags: List[str]
    digest: str
    status: str
    quant: str
    licence: str
    num_ctx: int
    router_role: str
    ci_only: bool = False


@dataclass
class TierConfig:
    """Configuration for a model tier."""
    name: str
    model_id: str
    num_ctx: int
    timeout: int
    quota: str


@dataclass
class UserQuota:
    """Per-user quota configuration."""
    user_id: str
    requests_per_minute: int = 60
    tokens_per_minute: int = 100000
    requests_per_hour: int = 1000
    tokens_per_hour: int = 1000000


@dataclass
class UserCost:
    """Per-user cost accounting."""
    user_id: str
    total_requests: int = 0
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    total_tokens: int = 0
    last_request_time: float = field(default_factory=time.time)
    cost_by_tier: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    cost_by_model: Dict[str, int] = field(default_factory=lambda: defaultdict(int))


class TokenBucket:
    """Simple token bucket rate limiter."""
    
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate  # tokens per second
        self.tokens = capacity
        self.last_refill = time.time()
    
    def consume(self, tokens: int = 1) -> bool:
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now
        
        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False
    
    def available(self) -> int:
        now = time.time()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        return int(self.tokens)


class UserQuotaTracker:
    """Tracks per-user quotas with sliding window."""
    
    def __init__(self):
        self.quotas: Dict[str, UserQuota] = {}
        self.request_windows: Dict[str, List[float]] = defaultdict(list)
        self.token_windows: Dict[str, List[Tuple[float, int]]] = defaultdict(list)
        self.lock = threading.RLock()
    
    def set_quota(self, user_id: str, quota: UserQuota) -> None:
        with self.lock:
            self.quotas[user_id] = quota
    
    def check_quota(self, user_id: str, tokens: int = 1) -> Tuple[bool, Optional[str]]:
        """Check if user has quota available.
        
        Returns (allowed, retry_after_seconds).
        """
        with self.lock:
            quota = self.quotas.get(user_id, UserQuota(user_id=user_id))
            now = time.time()
            
            # Clean old entries (older than 1 hour)
            cutoff_hour = now - 3600
            cutoff_minute = now - 60
            
            # Check request rate (per minute)
            recent_requests = [t for t in self.request_windows[user_id] if t > cutoff_minute]
            if len(recent_requests) >= quota.requests_per_minute:
                oldest = min(recent_requests) if recent_requests else now
                retry_after = int(oldest + 60 - now) + 1
                return False, retry_after
            
            # Check token rate (per minute)
            recent_tokens = sum(t for t, _ in self.token_windows[user_id] if t > cutoff_minute)
            if recent_tokens + tokens > quota.tokens_per_minute:
                # Find when enough tokens will be available
                total = 0
                for t, tok in reversed(self.token_windows[user_id]):
                    if t > cutoff_minute:
                        total += tok
                    if total + tokens <= quota.tokens_per_minute:
                        retry_after = int(t + 60 - now) + 1
                        break
                else:
                    retry_after = 60
                return False, retry_after
            
            # Check hourly limits
            recent_requests_hour = [t for t in self.request_windows[user_id] if t > cutoff_hour]
            if len(recent_requests_hour) >= quota.requests_per_hour:
                oldest = min(recent_requests_hour) if recent_requests_hour else now
                retry_after = int(oldest + 3600 - now) + 1
                return False, retry_after
            
            recent_tokens_hour = sum(t for t, _ in self.token_windows[user_id] if t > cutoff_hour)
            if recent_tokens_hour + tokens > quota.tokens_per_hour:
                retry_after = 3600
                return False, retry_after
            
            # All checks passed - record the request
            self.request_windows[user_id].append(now)
            self.token_windows[user_id].append((now, tokens))
            return True, None
    
    def get_usage(self, user_id: str) -> Dict[str, Any]:
        """Get current usage statistics for a user."""
        with self.lock:
            quota = self.quotas.get(user_id, UserQuota(user_id=user_id))
            now = time.time()
            cutoff_minute = now - 60
            cutoff_hour = now - 3600
            
            recent_requests = len([t for t in self.request_windows[user_id] if t > cutoff_minute])
            recent_tokens = sum(t for t, _ in self.token_windows[user_id] if t > cutoff_minute)
            recent_requests_hour = len([t for t in self.request_windows[user_id] if t > cutoff_hour])
            recent_tokens_hour = sum(t for t, _ in self.token_windows[user_id] if t > cutoff_hour)
            
            return {
                "user_id": user_id,
                "requests_per_minute": {"used": recent_requests, "limit": quota.requests_per_minute},
                "tokens_per_minute": {"used": recent_tokens, "limit": quota.tokens_per_minute},
                "requests_per_hour": {"used": recent_requests_hour, "limit": quota.requests_per_hour},
                "tokens_per_hour": {"used": recent_tokens_hour, "limit": quota.tokens_per_hour},
            }


class CostTracker:
    """Tracks per-user cost accounting (token usage)."""
    
    def __init__(self):
        self.costs: Dict[str, UserCost] = {}
        self.lock = threading.RLock()
    
    def record_usage(
        self,
        user_id: str,
        tier: str,
        model_id: str,
        prompt_tokens: int,
        completion_tokens: int
    ) -> None:
        with self.lock:
            if user_id not in self.costs:
                self.costs[user_id] = UserCost(user_id=user_id)
            
            cost = self.costs[user_id]
            cost.total_requests += 1
            cost.total_prompt_tokens += prompt_tokens
            cost.total_completion_tokens += completion_tokens
            cost.total_tokens += prompt_tokens + completion_tokens
            cost.last_request_time = time.time()
            cost.cost_by_tier[tier] += prompt_tokens + completion_tokens
            cost.cost_by_model[model_id] += prompt_tokens + completion_tokens
    
    def get_cost_summary(self, user_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            cost = self.costs.get(user_id)
            if not cost:
                return None
            return {
                "user_id": user_id,
                "total_requests": cost.total_requests,
                "total_prompt_tokens": cost.total_prompt_tokens,
                "total_completion_tokens": cost.total_completion_tokens,
                "total_tokens": cost.total_tokens,
                "last_request_time": cost.last_request_time,
                "cost_by_tier": dict(cost.cost_by_tier),
                "cost_by_model": dict(cost.cost_by_model),
            }
    
    def get_all_costs(self) -> Dict[str, Dict[str, Any]]:
        with self.lock:
            return {uid: self.get_cost_summary(uid) for uid in self.costs}


class ModelRegistry:
    """Loads and manages model registry configuration."""
    
    def __init__(self, registry_path: Path):
        self.registry_path = registry_path
        self.models: Dict[str, ModelConfig] = {}
        self.tiers: Dict[str, TierConfig] = {}
        self.routing_policy: Dict[str, str] = {}
        self._load()
    
    def _load(self):
        with open(self.registry_path) as f:
            data = yaml.safe_load(f)
        
        # Load models
        for m in data.get("models", []):
            model = ModelConfig(**m)
            self.models[model.id] = model
        
        # Load fake model if in test env
        if os.getenv("NOVA_ENV") == "test":
            fake = data.get("fake_model")
            if fake:
                model = ModelConfig(**fake)
                self.models[model.id] = model
        
        # Load routing policy
        routing = data.get("routing_policy", {})
        self.routing_policy = routing.get("family_tiers", {})
        
        # Build tier configs from models
        for model in self.models.values():
            if model.status == "pinned" or model.ci_only:
                tier_name = model.router_role
                if tier_name not in self.tiers:
                    self.tiers[tier_name] = TierConfig(
                        name=tier_name,
                        model_id=model.id,
                        num_ctx=model.num_ctx,
                        timeout=DEFAULT_TIMEOUT,
                        quota=DEFAULT_QUOTA,
                    )
    
    def get_model_for_tier(self, tier: str) -> Optional[ModelConfig]:
        if tier in self.tiers:
            return self.tiers[tier].model_id
        return None
    
    def get_tier_for_family(self, family: str) -> str:
        return self.routing_policy.get(family, "planner")
    
    def is_model_allowed(self, model_id: str) -> bool:
        return model_id in self.models
    
    def get_model_config(self, model_id: str) -> Optional[ModelConfig]:
        return self.models.get(model_id)


class Redactor:
    """Redacts sensitive information from prompts."""
    
    PATTERNS = [
        (re.compile(r"(?i)(api[_-]key|secret[_-]key|access[_-]token|refresh[_-]token|password|private[_-]key)\s*[:=]\s*[^\s]+"), "[REDACTED]"),
        (re.compile(r"sk-[a-zA-Z0-9]{20,}"), "[REDACTED]"),
        (re.compile(r"Bearer\s+[^\s]+"), "Bearer [REDACTED]"),
        (re.compile(r"(?i)authorization:\s*[^\s]+"), "Authorization: [REDACTED]"),
    ]
    
    @classmethod
    def redact(cls, text: str) -> str:
        for pattern, replacement in cls.PATTERNS:
            text = pattern.sub(replacement, text)
        return text


class Truncator:
    """Handles context truncation with marker."""
    
    TRUNCATION_MARKER = "... [truncated]"
    
    @classmethod
    def truncate(cls, text: str, max_tokens: int) -> Tuple[str, bool]:
        max_chars = max_tokens * 4
        if len(text) <= max_chars:
            return text, False
        
        truncated = text[:max_chars - len(cls.TRUNCATION_MARKER)]
        last_space = truncated.rfind(" ")
        if last_space > max_chars * 0.5:
            truncated = truncated[:last_space]
        
        return truncated + cls.TRUNCATION_MARKER, True


def create_app(registry_path: Optional[Path] = None) -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)
    
    # Load registry
    registry = ModelRegistry(registry_path or DEFAULT_REGISTRY_PATH)
    logger.info(f"Loaded {len(registry.models)} models, {len(registry.tiers)} tiers")
    
    # Initialize token buckets for each tier (tier-level rate limiting)
    tier_buckets: Dict[str, TokenBucket] = {}
    for tier_name, tier_config in registry.tiers.items():
        match = re.match(r"(\d+)/(\w+)", tier_config.quota)
        if match:
            count = int(match.group(1))
            period = match.group(2)
            if period in ("minute", "minutes"):
                refill_rate = count / 60.0
            elif period in ("hour", "hours"):
                refill_rate = count / 3600.0
            elif period in ("second", "seconds"):
                refill_rate = count
            else:
                refill_rate = count / 60.0
        else:
            count = 60
            refill_rate = 1.0
        
        tier_buckets[tier_name] = TokenBucket(capacity=count, refill_rate=refill_rate)
    
    # Initialize per-user quota tracker
    user_quota_tracker = UserQuotaTracker()
    
    # Initialize cost tracker
    cost_tracker = CostTracker()
    
    def check_tier_quota(tier: str) -> bool:
        """Check and consume tier-level quota."""
        bucket = tier_buckets.get(tier)
        if not bucket:
            return True
        return bucket.consume()
    
    def get_user_id() -> str:
        """Extract user ID from request headers or auth."""
        # In production, this would come from verified JWT
        # For now, use a header or default
        return request.headers.get("X-User-ID", "anonymous")
    
    @app.route("/health/live")
    def health_live():
        return jsonify({"status": "live"})
    
    @app.route("/health/ready")
    def health_ready():
        return jsonify({"status": "ready", "models": len(registry.models)})
    
    @app.route("/v1/models", methods=["GET"])
    def list_models():
        """List available models."""
        models = []
        for model in registry.models.values():
            if model.ci_only and os.getenv("NOVA_ENV") != "test":
                continue
            models.append({
                "id": model.id,
                "provider": model.provider,
                "tags": model.tags,
                "status": model.status,
                "num_ctx": model.num_ctx,
                "router_role": model.router_role,
            })
        return jsonify({"models": models})
    
    @app.route("/v1/models/<model_id>", methods=["GET"])
    def get_model(model_id: str):
        """Get model details."""
        model = registry.get_model_config(model_id)
        if not model:
            return jsonify({"error": "Model not found"}), 404
        return jsonify({
            "id": model.id,
            "provider": model.provider,
            "tags": model.tags,
            "digest": model.digest,
            "status": model.status,
            "quant": model.quant,
            "licence": model.licence,
            "num_ctx": model.num_ctx,
            "router_role": model.router_role,
        })
    
    @app.route("/v1/quota/<user_id>", methods=["GET"])
    def get_quota(user_id: str):
        """Get quota usage for a user."""
        usage = user_quota_tracker.get_usage(user_id)
        return jsonify(usage)
    
    @app.route("/v1/cost/<user_id>", methods=["GET"])
    def get_cost(user_id: str):
        """Get cost accounting for a user."""
        cost = cost_tracker.get_cost_summary(user_id)
        if cost is None:
            return jsonify({"error": "User not found"}), 404
        return jsonify(cost)
    
    @app.route("/v1/costs", methods=["GET"])
    def get_all_costs():
        """Get cost accounting for all users (admin only)."""
        # In production, add admin scope check
        return jsonify(cost_tracker.get_all_costs())
    
    @app.route("/v1/completions", methods=["POST"])
    def completions():
        """Handle completion requests."""
        start_time = time.time()
        
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Request body must be JSON"}), 400
            
            user_id = get_user_id()
            
            # Get model from request or use tier-based routing
            model_id = data.get("model")
            tier = data.get("tier")
            prompt = data.get("prompt", "")
            max_tokens = data.get("max_tokens", 1024)
            temperature = data.get("temperature", 0.7)
            
            if not model_id and not tier:
                return jsonify({"error": "Either 'model' or 'tier' must be provided"}), 400
            
            # Resolve model
            if tier:
                model_id = registry.get_model_for_tier(tier)
                if not model_id:
                    return jsonify({"error": f"No model configured for tier '{tier}'"}), 400
            
            if not registry.is_model_allowed(model_id):
                return jsonify({"error": f"Model '{model_id}' is not allowed"}), 403
            
            model_config = registry.get_model_config(model_id)
            if not model_config:
                return jsonify({"error": f"Model '{model_id}' not found"}), 404
            
            tier_name = model_config.router_role
            
            # Estimate tokens for quota check
            estimated_prompt_tokens = len(prompt) // 4
            estimated_tokens = estimated_prompt_tokens + max_tokens
            
            # Check tier quota
            if not check_tier_quota(tier_name):
                return jsonify({
                    "error": "Quota exceeded",
                    "code": "QUOTA_EXCEEDED",
                    "retry_after": 60,
                }), 429
            
            # Check per-user quota
            user_allowed, retry_after = user_quota_tracker.check_quota(user_id, estimated_tokens)
            if not user_allowed:
                return jsonify({
                    "error": "Quota exceeded",
                    "code": "QUOTA_EXCEEDED",
                    "retry_after": retry_after,
                }), 429
            
            # Redact secrets from prompt
            redacted_prompt = Redactor.redact(prompt)
            
            # Truncate prompt to num_ctx
            truncated_prompt, was_truncated = Truncator.truncate(redacted_prompt, model_config.num_ctx)
            
            # Actual token counts after truncation
            actual_prompt_tokens = len(truncated_prompt) // 4
            
            # TODO: Call actual Ollama/llama.cpp here
            # For now, return a mock response
            response_text = f"[MOCK] Model {model_id} would respond to: {truncated_prompt[:100]}..."
            actual_completion_tokens = len(response_text) // 4
            
            elapsed = time.time() - start_time
            
            # Record cost accounting
            cost_tracker.record_usage(
                user_id=user_id,
                tier=tier_name,
                model_id=model_id,
                prompt_tokens=actual_prompt_tokens,
                completion_tokens=actual_completion_tokens,
            )
            
            return jsonify({
                "id": f"cmpl-{int(time.time() * 1000)}",
                "object": "text_completion",
                "created": int(time.time()),
                "model": model_id,
                "choices": [{
                    "text": response_text,
                    "index": 0,
                    "logprobs": None,
                    "finish_reason": "stop",
                }],
                "usage": {
                    "prompt_tokens": actual_prompt_tokens,
                    "completion_tokens": actual_completion_tokens,
                    "total_tokens": actual_prompt_tokens + actual_completion_tokens,
                },
                "meta": {
                    "tier": tier_name,
                    "truncated": was_truncated,
                    "latency_ms": int(elapsed * 1000),
                },
            })
        
        except Exception as e:
            logger.exception("Completion error")
            return jsonify({"error": str(e)}), 500
    
    @app.route("/v1/chat/completions", methods=["POST"])
    def chat_completions():
        """Handle chat completion requests (OpenAI-compatible)."""
        return completions()
    
    return app


def main():
    """Run the gateway server."""
    port = int(os.getenv("PORT", "8002"))
    registry_path = os.getenv("MODEL_REGISTRY_PATH", str(DEFAULT_REGISTRY_PATH))
    
    app = create_app(Path(registry_path))
    app.run(host="0.0.0.0", port=port, debug=False)


if __name__ == "__main__":
    main()