"""Health check tests for whatsapp-adapter."""

import pytest


def test_health_live(client):
    """Health check should return 200 for liveness."""
    resp = client.get("/health/live")
    assert resp.status_code == 200
    assert resp.json["status"] == "live"


def test_health_ready(client):
    """Health check should return 200 for readiness."""
    resp = client.get("/health/ready")
    assert resp.status_code == 200
    assert resp.json["status"] == "ready"


def test_app_has_health_routes(app):
    """Health routes should be registered."""
    rules = [rule.rule for rule in app.url_map.iter_rules()]
    assert "/health/live" in rules
    assert "/health/ready" in rules
