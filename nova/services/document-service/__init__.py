"""Flask app factory for the document service."""

from flask import Flask, jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge

from nova.services.document_service.schemas import DocumentServiceSettings, QuarantineSettings


def create_app(settings: DocumentServiceSettings | None = None) -> Flask:
    """Create the Flask application with all blueprints."""
    if settings is None:
        settings = DocumentServiceSettings()

    app = Flask(settings.app_name)
    app.config["MAX_CONTENT_LENGTH"] = settings.quarantine.max_file_size_bytes
    app.config["settings"] = settings

    # Error handlers
    @app.errorhandler(RequestEntityTooLarge)
    def handle_file_too_large(e):
        return jsonify({
            "error": "file_too_large",
            "message": f"File exceeds maximum size of {settings.quarantine.max_file_size_bytes} bytes",
            "max_size": settings.quarantine.max_file_size_bytes,
        }), 413

    @app.errorhandler(400)
    def handle_bad_request(e):
        return jsonify({"error": "bad_request", "message": str(e.description)}), 400

    @app.errorhandler(500)
    def handle_internal_error(e):
        app.logger.exception("Internal server error")
        return jsonify({"error": "internal_error", "message": "An unexpected error occurred"}), 500

    # Health endpoints
    @app.route("/health/live", methods=["GET"])
    def health_live():
        return jsonify({"status": "live"})

    @app.route("/health/ready", methods=["GET"])
    def health_ready():
        # Check Redis connectivity
        try:
            from redis import Redis
            r = Redis.from_url(settings.worker.redis_url, socket_connect_timeout=2)
            r.ping()
            redis_ok = True
        except Exception:
            redis_ok = False

        # Check object store
        try:
            from minio import Minio
            client = Minio(
                settings.object_store_endpoint.replace("http://", "").replace("https://", ""),
                access_key=settings.object_store_access_key,
                secret_key=settings.object_store_secret_key,
                secure=settings.object_store_endpoint.startswith("https"),
            )
            client.bucket_exists(settings.object_store_bucket)
            storage_ok = True
        except Exception:
            storage_ok = False

        ready = redis_ok and storage_ok
        return jsonify({
            "status": "ready" if ready else "not_ready",
            "checks": {
                "redis": redis_ok,
                "object_store": storage_ok,
            }
        }), 200 if ready else 503

    # CORS
    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        if origin in settings.allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response

    # Register blueprints
    from nova.services.document_service.api.ingest import ingest_bp
    from nova.services.document_service.api.results import results_bp

    app.register_blueprint(ingest_bp, url_prefix="/api/v1")
    app.register_blueprint(results_bp, url_prefix="/api/v1")

    return app


def run_app():
    """Run the app with gunicorn-compatible settings."""
    settings = DocumentServiceSettings()
    app = create_app(settings)
    app.run(host=settings.host, port=settings.port, debug=settings.debug)