"""Results endpoint for retrieving parsed documents."""

from flask import Blueprint, current_app, jsonify
import uuid

results_bp = Blueprint("results", __name__)


@results_bp.route("/parse-results/<document_id>", methods=["GET"])
def get_parse_result(document_id: str):
    """Get the parse result for a document (alias for /documents/<id>)."""
    try:
        uuid.UUID(document_id)
    except ValueError:
        return jsonify({"error": "invalid_id", "message": "Invalid document ID format"}), 400

    from nova.services.document_service.storage import get_parsed_document

    try:
        envelope = get_parsed_document(document_id, current_app.config["settings"])
        if envelope is None:
            return jsonify({"error": "not_found", "message": "Document not found"}), 404

        return jsonify(envelope.to_storage_dict()), 200
    except Exception as e:
        current_app.logger.exception("Result retrieval failed")
        return jsonify({"error": "retrieval_failed", "message": "Failed to retrieve result"}), 500