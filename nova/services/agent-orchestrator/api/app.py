#!/usr/bin/env python3
"""Flask API boundary for NOVA Agent Orchestrator."""

import os
import uuid
import json
import asyncio
import logging
from functools import wraps
from typing import Optional, Dict, Any
from datetime import datetime
from pathlib import Path

from flask import Flask, request, jsonify, Response

# Import our modules
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from orchestrator.workflows import run_workflow
from orchestrator.workflows.state import WorkflowState

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Service token verification
SERVICE_JWT_SECRET = os.getenv("NOVA_SERVICE_JWT_SECRET")
SERVICE_JWT_ISSUER = os.getenv("NOVA_SERVICE_JWT_ISSUER", "nova")
SERVICE_JWT_AUDIENCE = os.getenv("NOVA_SERVICE_JWT_AUDIENCE", "nova-orchestrator")


def verify_service_token(token: str) -> Dict[str, Any]:
    """Verify a service JWT token."""
    import hmac
    import hashlib
    import base64
    
    if not SERVICE_JWT_SECRET:
        return {"ok": False, "reason": "service_token_not_configured"}
    
    parts = token.split(".")
    if len(parts) != 3:
        return {"ok": False, "reason": "malformed_token"}
    
    head, body, signature = parts
    
    # Verify signature
    signing_input = f"{head}.{body}"
    expected_sig = base64.urlsafe_b64encode(
        hmac.new(SERVICE_JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256).digest()
    ).decode().rstrip("=")
    
    given_sig = signature + "=" * ((4 - len(signature) % 4) % 4)
    if not hmac.compare_digest(expected_sig, given_sig):
        return {"ok": False, "reason": "bad_signature"}
    
    # Decode and verify claims
    try:
        padding = 4 - len(body) % 4 if len(body) % 4 != 0 else 0
        claims = json.loads(base64.urlsafe_b64decode(body + "=" * padding).decode())
    except Exception:
        return {"ok": False, "reason": "bad_claims"}
    
    # Verify standard claims
    if claims.get("iss") != SERVICE_JWT_ISSUER:
        return {"ok": False, "reason": "unknown_issuer"}
    if claims.get("aud") != SERVICE_JWT_AUDIENCE:
        return {"ok": False, "reason": "unknown_audience"}
    if claims.get("exp", 0) < int(datetime.utcnow().timestamp()):
        return {"ok": False, "reason": "expired_token"}
    
    return {"ok": True, "claims": claims}


def require_service_token(f):
    """Decorator to require valid service token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "missing_service_token"}), 401
        
        token = auth_header[7:]
        result = verify_service_token(token)
        if not result["ok"]:
            return jsonify({"error": result["reason"]}), 401
        
        request.service_claims = result["claims"]
        return f(*args, **kwargs)
    return decorated


app = Flask(__name__)


@app.route("/health/live")
def health_live():
    return jsonify({"status": "live"})


@app.route("/health/ready")
def health_ready():
    return jsonify({"status": "ready"})


@app.route("/plan", methods=["POST"])
@require_service_token
def create_plan():
    """Create a new workflow plan."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "invalid_json"}), 400
    
    user_id = data.get("user_id")
    initial_action = data.get("action")
    
    if not user_id or not initial_action:
        return jsonify({"error": "user_id and action required"}), 400
    
    plan_id = str(uuid.uuid4())
    
    # Run workflow asynchronously
    import asyncio
    result = asyncio.run(run_workflow(
        plan_id=plan_id,
        user_id=user_id,
        initial_action=data["action"],
        use_fake_model=True,  # Use fake model for now
    ))
    
    return jsonify(result), 201


@app.route("/plan/<plan_id>", methods=["GET"])
@require_service_token
def get_plan(plan_id: str):
    """Get plan status."""
    # In real implementation, fetch from checkpointer
    return jsonify({"error": "not_implemented"}), 501


@app.route("/plan/<plan_id>/cancel", methods=["POST"])
@require_service_token
def cancel_plan(plan_id: str):
    """Cancel a running plan."""
    # In real implementation, update checkpointer state
    return jsonify({"error": "not_implemented"}), 501


@app.route("/plan/<plan_id>/resume", methods=["POST"])
@require_service_token
def resume_plan(plan_id: str):
    """Resume a paused plan (after approval)."""
    data = request.get_json() or {}
    approval_grant = data.get("approval_grant")
    
    if not approval_grant:
        return jsonify({"error": "approval_grant required"}), 400
    
    # In real implementation, resume with interrupt value
    return jsonify({"error": "not_implemented"}), 501


@app.route("/plan/<plan_id>/steps", methods=["GET"])
@require_service_token
def get_plan_steps(plan_id: str):
    """Get plan steps and their status."""
    # In real implementation, fetch from checkpointer
    return jsonify({"error": "not_implemented"}), 501


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8005"))
    app.run(host="0.0.0.0", port=port, debug=False)