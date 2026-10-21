"""Prove that the template serves the health endpoints."""

from app import create_app


def client():
    """Return a test client for the template application."""
    return create_app().test_client()


def test_live_reports_that_the_process_runs():
    """The live endpoint answers that the process runs."""
    response = client().get("/health/live")
    assert response.status_code == 200
    assert response.get_json() == {"status": "live"}


def test_ready_reports_that_the_service_accepts_traffic():
    """The ready endpoint answers that the service accepts traffic."""
    response = client().get("/health/ready")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ready"}


def test_the_health_endpoints_leak_no_secret():
    """The health endpoints return no other field."""
    body = client().get("/health/live").get_json()
    assert set(body) == {"status"}
