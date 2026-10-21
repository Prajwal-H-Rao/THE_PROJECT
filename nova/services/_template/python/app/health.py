"""Serve the health endpoints. The endpoints must leak no secret."""

from flask import Blueprint, jsonify

health_blueprint = Blueprint("health", __name__)


@health_blueprint.get("/health/live")
def live():
    """Report that the process runs."""
    return jsonify({"status": "live"})


@health_blueprint.get("/health/ready")
def ready():
    """Report that the service accepts traffic."""
    return jsonify({"status": "ready"})
