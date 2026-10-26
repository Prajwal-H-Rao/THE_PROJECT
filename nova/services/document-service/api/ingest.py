"""Ingest endpoint for document upload and quarantine."""

from flask import Blueprint, current_app, jsonify, request

from nova.services.document_service.schemas import DocumentServiceSettings
from nova.services.document_service.ingest.quarantine import (
    quarantine_file,
    validate_file,
    QuarantineError,
    ValidationError,
)
from nova.services.document_service.worker.queue import enqueue_parse_job
from nova.services.document_service.storage import get_parsed_document

ingest_bp = Blueprint("ingest", __name__)


@ingest_bp.route("/documents", methods=["POST"])
def upload_document():
    """Upload a document for parsing. Returns a document ID for polling."""
    settings: DocumentServiceSettings = current_app.config["settings"]

    # Check for file in request
    if "file" not in request.files:
        return jsonify({"error": "no_file", "message": "No file part in request"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "no_filename", "message": "No filename provided"}), 400

    # Get optional metadata
    user_id = request.form.get("user_id")
    source_type = request.form.get("source_type", "upload")
    source_ref = request.form.get("source_ref")

    try:
        # Validate file
        file_bytes = file.read()
        validate_file(file_bytes, file.filename, settings.quarantine)

        # Quarantine the file
        quarantine_result = quarantine_file(
            file_bytes=file_bytes,
            original_filename=file.filename,
            settings=settings.quarantine,
            user_id=user_id,
            source_type=source_type,
            source_ref=source_ref,
        )

        # Enqueue parsing job
        job_id = enqueue_parse_job(
            document_id=quarantine_result["document_id"],
            quarantine_path=quarantine_result["quarantine_path"],
            mime_type=quarantine_result["mime_type"],
            settings=settings,
        )

        return jsonify({
            "document_id": quarantine_result["document_id"],
            "job_id": job_id,
            "status": "queued",
            "message": "Document queued for parsing",
        }), 202

    except ValidationError as e:
        return jsonify({"error": "validation_failed", "message": str(e)}), 400
    except QuarantineError:
        current_app.logger.error("Quarantine failed")
        return jsonify({"error": "quarantine_failed", "message": "Failed to store file"}), 500
    except Exception:
        current_app.logger.exception("Upload failed")
        return jsonify({"error": "upload_failed", "message": "Internal error"}), 500


@ingest_bp.route("/documents/<document_id>/status", methods=["GET"])
def document_status(document_id: str):
    """Get the parsing status of a document."""
    try:
        from uuid import UUID
        UUID(document_id)  # Validate UUID format
    except ValueError:
        return jsonify({"error": "invalid_id", "message": "Invalid document ID format"}), 400

    try:
        envelope = get_parsed_document(document_id, current_app.config["settings"])
        if envelope is None:
            return jsonify({
                "document_id": document_id,
                "status": "processing",
                "message": "Document is being parsed or not found",
            }), 200

        return jsonify({
            "document_id": document_id,
            "status": "completed",
            "object_ref": envelope.object_ref,
            "field_count": len(envelope.document.fields),
            "warnings": envelope.document.warnings,
        }), 200
    except Exception:
        current_app.logger.exception("Status check failed")
        return jsonify({"error": "status_failed", "message": "Failed to check status"}), 500


@ingest_bp.route("/documents/<document_id>", methods=["GET"])
def get_document(document_id: str):
    """Get the full parsed document."""
    try:
        from uuid import UUID
        UUID(document_id)
    except ValueError:
        return jsonify({"error": "invalid_id", "message": "Invalid document ID format"}), 400

    try:
        envelope = get_parsed_document(document_id, current_app.config["settings"])
        if envelope is None:
            return jsonify({"error": "not_found", "message": "Document not found or not yet parsed"}), 404

        # Return the full extraction envelope
        return jsonify(envelope.to_storage_dict()), 200
    except Exception:
        current_app.logger.exception("Document retrieval failed")
        return jsonify({"error": "retrieval_failed", "message": "Failed to retrieve document"}), 500