"""Health check endpoints for employer-registry-service."""

from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.route("/health/live", methods=["GET"])
def health_live():
    return jsonify({"status": "live"}), 200


@health_bp.route("/health/ready", methods=["GET"])
def health_ready():
    return jsonify({"status": "ready"}), 200
