#!/usr/bin/env python3
"""NOVA Model Gateway - Flask service for model inference with quotas and provider allow-list."""

import os
import re
import time
import json
import yaml
import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Literal
from pathlib import Path
from functools import wraps

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
        """Get the model ID for a given tier."""
        if tier in self.tiers:
            return self.tiers[tier].model_id
        return None
    
    def get_tier_for_family(self, family: str) -> str:
        """Get the tier for a task family."""
        return self.routing_policy.get(family, "planner")
    
    def is_model_allowed(self, model_id: str) -> bool:
        """Check if a model is in the allow-list."""
        return model_id in self.models
    
    def get_model_config(self, model_id: str) -> Optional[ModelConfig]:
        return self.models.get(model_id)


class Redactor:
    """Redacts sensitive information from prompts."""
    
    # Patterns for secrets
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
    def truncate(cls, text: str, max_tokens: int) -> tuple[str, bool]:
        """Truncate text to approximately max_tokens.
        
        Returns (truncated_text, was_truncated).
        """
        # Rough token estimation: 1 token ≈ 4 chars for English
        max_chars = max_tokens * 4
        if len(text) <= max_chars:
            return text, False
        
        # Truncate at word boundary
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
    
    # Initialize token buckets for each tier
    tier_buckets: Dict[str, TokenBucket] = {}
    for tier_name, tier_config in registry.tiers.items():
        # Parse quota like "60/minute"
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
    
    def check_quota(tier: str) -> bool:
        """Check and consume quota for a tier."""
        bucket = tier_buckets.get(tier)
        if not bucket:
            return True  # No bucket = no limit
        return bucket.consume()
    
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
    
    @app.route("/v1/completions", methods=["POST"])
    def completions():
        """Handle completion requests."""
        start_time = time.time()
        
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Request body must be JSON"}), 400
            
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
            
            # Check quota
            tier_name = model_config.router_role
            if not check_quota(tier_name):
                return jsonify({
                    "error": "Quota exceeded",
                    "retry_after": 60,
                }), 429
            
            # Redact secrets from prompt
            redacted_prompt = Redactor.redact(prompt)
            
            # Truncate prompt to num_ctx
            truncated_prompt, was_truncated = Truncator.truncate(redacted_prompt, model_config.num_ctx)
            
            # TODO: Call actual Ollama/llama.cpp here
            # For now, return a mock response
            response_text = f"[MOCK] Model {model_id} would respond to: {truncated_prompt[:100]}..."
            
            elapsed = time.time() - start_time
            
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
                    "prompt_tokens": len(truncated_prompt) // 4,
                    "completion_tokens": len(response_text) // 4,
                    "total_tokens": (len(truncated_prompt) + len(response_text)) // 4,
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
        # Similar to completions but for chat format
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