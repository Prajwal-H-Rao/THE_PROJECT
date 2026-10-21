"""Build the Flask application. The factory keeps the app testable."""

from flask import Flask

from .config import Settings
from .health import health_blueprint
from .logging_setup import configure_logging


def create_app(settings=None):
    """Return a configured Flask application."""
    app = Flask(__name__)
    config = settings or Settings()
    configure_logging(config.log_level)
    app.config["SETTINGS"] = config
    app.register_blueprint(health_blueprint)
    return app
