"""Application factory for calendar-service."""

from flask import Flask

from .health import health_bp


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.register_blueprint(health_bp)
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=8000)
