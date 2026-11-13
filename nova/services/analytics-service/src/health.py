"""Health check endpoints for analytics-service."""

from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.route("/health/live", methods=["GET"])
def health_live():
    """Liveness probe - returns 200 if the service process is running."""
    return jsonify({"status": "live"}), 200


@health_bp.route("/health/ready", methods=["GET"])
def health_ready():
    """Readiness probe - returns 200 if the service can serve requests."""
    return jsonify({"status": "ready"}), 200
