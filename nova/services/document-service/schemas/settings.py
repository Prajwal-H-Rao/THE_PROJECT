"""Settings for the document service using Pydantic Settings."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class QuarantineSettings(BaseSettings):
    """Quarantine configuration for uploaded files."""

    model_config = SettingsConfigDict(env_prefix="NOVA_QUARANTINE_")

    max_file_size_bytes: int = Field(default=50 * 1024 * 1024, description="Maximum file size (50MB)")
    max_pages: int = Field(default=500, description="Maximum pages for PDF/DOCX")
    allowed_mime_types: tuple[str, ...] = Field(
        default=(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/csv",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain",
        ),
        description="Allowed MIME types",
    )
    allowed_extensions: tuple[str, ...] = Field(
        default=(".pdf", ".docx", ".csv", ".xlsx", ".txt"),
        description="Allowed file extensions",
    )
    storage_path: str = Field(default="/app/quarantine", description="Quarantine storage path")


class ParserSettings(BaseSettings):
    """Parser configuration."""

    model_config = SettingsConfigDict(env_prefix="NOVA_PARSER_")

    pdf_engine: str = Field(default="pymupdf", description="PDF parser: pymupdf or pdfplumber")
    ocr_engine: str = Field(default="tesseract", description="OCR engine")
    ocr_lang: str = Field(default="eng", description="OCR language")
    ocr_confidence_threshold: float = Field(default=0.7, description="OCR confidence threshold for review")
    csv_encoding: str = Field(default="utf-8", description="Default CSV encoding")
    csv_delimiter: str = Field(default=",", description="Default CSV delimiter")


class WorkerSettings(BaseSettings):
    """RQ worker configuration."""

    model_config = SettingsConfigDict(env_prefix="NOVA_WORKER_")

    redis_url: str = Field(default="redis://redis:6379/0", description="Redis connection URL")
    default_timeout: int = Field(default=300, description="Default job timeout (seconds)")
    max_jobs: int = Field(default=10, description="Maximum concurrent jobs")
    dead_letter_ttl_days: int = Field(default=7, description="Dead letter TTL (days)")


class DocumentServiceSettings(BaseSettings):
    """Main document service settings."""

    model_config = SettingsConfigDict(env_prefix="NOVA_DOC_", env_file=".env", env_file_encoding="utf-8")

    app_name: str = Field(default="nova-document-service")
    debug: bool = Field(default=False)
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8080)
    workers: int = Field(default=4)

    quarantine: QuarantineSettings = Field(default_factory=QuarantineSettings)
    parser: ParserSettings = Field(default_factory=ParserSettings)
    worker: WorkerSettings = Field(default_factory=WorkerSettings)

    # Storage
    object_store_endpoint: str = Field(default="http://rustfs:9000")
    object_store_bucket: str = Field(default="nova-documents")
    object_store_access_key: str = Field(default="minioadmin")
    object_store_secret_key: str = Field(default="minioadmin")

    # Security
    api_key: str = Field(default="", description="API key for internal endpoints")
    allowed_origins: tuple[str, ...] = Field(default=("http://localhost:3000",), description="CORS allowed origins")
