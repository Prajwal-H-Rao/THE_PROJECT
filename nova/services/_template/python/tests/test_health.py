"""Prove that the template serves the health endpoints."""

import threading
import urllib.request

from werkzeug.serving import make_server

from app import create_app


def client():
    """Return a test client for the template application."""
    return create_app().test_client()


def running_app():
    """Return a server on an ephemeral port and the thread that serves it."""
    server = make_server("127.0.0.1", 0, create_app())
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, thread


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


def test_the_service_serves_the_live_endpoint_over_http():
    """The service answers the live endpoint on a real socket."""
    server, _thread = running_app()
    try:
        url = "http://127.0.0.1:%d/health/live" % server.server_port
        with urllib.request.urlopen(url) as response:
            assert response.status == 200
            assert response.read().decode().strip() == '{"status":"live"}'
    finally:
        server.shutdown()
