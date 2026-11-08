"""Test for task 06.3: serve the Flask app with a production WSGI server.

stdlib-only: reads the app factory source as text and asserts the
production WSGI server (gunicorn) is used and the Flask dev server
(app.run / flask run) is not. Runs with plain python3; no flask,
gunicorn or pytest installed locally.
"""

import pathlib

APP_FACTORY = pathlib.Path(__file__).resolve().parent / "__init__.py"


def read_source() -> str:
    """Return the app factory source text."""
    return APP_FACTORY.read_text(encoding="utf-8")


def test_production_wsgi_server_is_gunicorn() -> None:
    """The app factory must use gunicorn as the production WSGI server."""
    source = read_source()
    assert "gunicorn" in source, "gunicorn (production WSGI server) not referenced"
    assert "WSGI" in source, "WSGI server entrypoint not referenced"


def test_flask_dev_server_not_used() -> None:
    """The app factory must not start the Flask dev server."""
    source = read_source()
    assert "app.run(" not in source, "Flask dev server app.run() must not be used"
    assert "debug=True" not in source, "debug mode must not be enabled"


if __name__ == "__main__":
    test_production_wsgi_server_is_gunicorn()
    test_flask_dev_server_not_used()
    print("PASS test_wsgi_server: gunicorn WSGI server used, Flask dev server not used")
