"""Object storage for parsed documents."""

import json
import uuid
from datetime import datetime
from io import BytesIO
from typing import Any

from minio import Minio
from minio.error import S3Error

from nova.services.document_service.schemas import DocumentServiceSettings
from nova.services.document_service.schemas.extraction import ExtractionEnvelope, ParsedDocument


def get_minio_client(settings: DocumentServiceSettings) -> Minio:
    """Get MinIO client for object storage."""
    endpoint = settings.object_store_endpoint
    if endpoint.startswith("http://"):
        endpoint = endpoint[7:]
    elif endpoint.startswith("https://"):
        endpoint = endpoint[8:]

    return Minio(
        endpoint,
        access_key=settings.object_store_access_key,
        secret_key=settings.object_store_secret_key,
        secure=settings.object_store_endpoint.startswith("https"),
    )


def ensure_bucket(client: Minio, bucket: str) -> None:
    """Ensure bucket exists."""
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)


def store_parsed_document(envelope: ExtractionEnvelope, settings: DocumentServiceSettings) -> str:
    """Store a parsed document in object storage and return the object reference."""
    client = get_minio_client(settings)
    ensure_bucket(client, settings.object_store_bucket)

    # Generate content-addressed object key
    document = envelope.document
    doc_id = str(document.metadata.document_id)
    sha256 = document.metadata.sha256

    # Use SHA-256 as object key for content addressing
    object_key = f"parsed/{sha256[:2]}/{sha256[2:4]}/{sha256}.json"

    # Serialize envelope
    data = envelope.to_storage_dict()
    json_bytes = json.dumps(data, separators=(",", ":"), ensure_ascii=False).encode("utf-8")

    # Upload
    try:
        client.put_object(
            settings.object_store_bucket,
            object_key,
            BytesIO(json_bytes),
            length=len(json_bytes),
            content_type="application/json",
        )
    except S3Error as e:
        raise RuntimeError(f"Failed to store document: {e}")

    return f"s3://{settings.object_store_bucket}/{object_key}"


def get_parsed_document(document_id: str, settings: DocumentServiceSettings) -> ExtractionEnvelope | None:
    """Retrieve a parsed document by document ID."""
    client = get_minio_client(settings)

    # We need to find the object by document_id
    # Since we use SHA-256 as key, we'd need an index
    # For now, scan the bucket (inefficient but works for small scale)
    # In production, use a separate index (PostgreSQL, Redis, etc.)

    try:
        objects = client.list_objects(
            settings.object_store_bucket,
            prefix="parsed/",
            recursive=True,
        )

        for obj in objects:
            try:
                response = client.get_object(settings.object_store_bucket, obj.object_name)
                data = json.loads(response.read().decode("utf-8"))
                envelope = ExtractionEnvelope.from_storage_dict(data, obj.object_name)
                if str(envelope.document.metadata.document_id) == document_id:
                    return envelope
            except Exception:
                continue
    except S3Error:
        pass

    return None


def delete_parsed_document(document_id: str, settings: DocumentServiceSettings) -> bool:
    """Delete a parsed document from object storage."""
    client = get_minio_client(settings)

    try:
        objects = client.list_objects(
            settings.object_store_bucket,
            prefix="parsed/",
            recursive=True,
        )

        for obj in objects:
            try:
                response = client.get_object(settings.object_store_bucket, obj.object_name)
                data = json.loads(response.read().decode("utf-8"))
                if str(data.get("document", {}).get("metadata", {}).get("document_id")) == document_id:
                    client.remove_object(settings.object_store_bucket, obj.object_name)
                    return True
            except Exception:
                continue
    except S3Error:
        pass

    return False


def list_parsed_documents(
    settings: DocumentServiceSettings,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List parsed documents with pagination."""
    client = get_minio_client(settings)

    results = []
    try:
        objects = client.list_objects(
            settings.object_store_bucket,
            prefix="parsed/",
            recursive=True,
        )

        for i, obj in enumerate(objects):
            if i < offset:
                continue
            if len(results) >= limit:
                break

            try:
                response = client.get_object(settings.object_store_bucket, obj.object_name)
                data = json.loads(response.read().decode("utf-8"))
                doc_meta = data.get("document", {}).get("metadata", {})
                results.append({
                    "document_id": doc_meta.get("document_id"),
                    "original_filename": doc_meta.get("original_filename"),
                    "mime_type": doc_meta.get("mime_type"),
                    "file_size": doc_meta.get("file_size"),
                    "sha256": doc_meta.get("sha256"),
                    "parsed_at": doc_meta.get("parsed_at"),
                    "field_count": len(data.get("document", {}).get("fields", [])),
                    "object_ref": f"s3://{settings.object_store_bucket}/{obj.object_name}",
                })
            except Exception:
                continue
    except S3Error:
        pass

    return results