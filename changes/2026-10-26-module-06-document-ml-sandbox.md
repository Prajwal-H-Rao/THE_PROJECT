# 2026-10-26 — Module 06 — Document and ML sandbox (all 21 tasks)

## Scope

Complete Module 06 (Document and ML sandbox) — all 21 tasks per build order.

## Files Created/Modified

### Document Service (nova/services/document-service/)

**Schemas (Task 1):**
- `schemas/__init__.py` — exports
- `schemas/settings.py` — Pydantic Settings with quarantine, parser, worker config
- `schemas/extraction.py` — ExtractionEnvelope, FieldExtraction, SourceSpan, Confidence, ReviewStatus, ParsedDocument, ParsedDocumentMetadata

**Flask App Factory (Task 2):**
- `__init__.py` — create_app() with health endpoints, CORS, error handlers, blueprint registration

**Quarantine & Ingest (Task 4):**
- `ingest/quarantine.py` — validate_file(), quarantine_file(), compute_sha256(), magic byte checks
- `ingest/__init__.py`
- `api/ingest.py` — POST /documents, GET /documents/<id>/status, GET /documents/<id>
- `api/results.py` — GET /parse-results/<id>

**Parsers (Tasks 5-8):**
- `parser/base.py` — BaseParser abstract class with provenance helpers
- `parser/pdf_parser.py` — PDFParser using PyMuPDF with page/span provenance
- `parser/docx_parser.py` — DOCXParser using python-docx with paragraph provenance
- `parser/csv_parser.py` — CSVParser using pandas with column provenance
- `parser/txt_parser.py` — TXTParser with bank statement detection and row/column provenance
- `parser/registry.py` — ParserRegistry factory by MIME type/extension

**RQ Worker (Tasks 10-11):**
- `worker/queue.py` — get_parse_queue(), enqueue_parse_job(), dead letter handling
- `worker/tasks.py` — parse_document_task() for RQ
- `worker/cli.py` — CLI with worker and test-parser commands
- `worker/__init__.py`

**Storage (Task 15):**
- `storage.py` — MinIO client, store_parsed_document(), get_parsed_document(), content-addressed keys

**Dockerfile (Task 12):**
- Multi-stage build, non-root user (appuser), read-only rootfs, dropped capabilities, resource limits
- Installs: libmupdf-dev, tesseract-ocr, poppler-utils, libxml2, libxslt, openblas

**Requirements (pinned):**
- `requirements.txt` — all dependencies pinned

### Inference Worker (Task 16)
- `nova/workers/inference-worker/__init__.py` — RQ queue for ML inference
- `nova/workers/inference-worker/tasks/inference.py` — embedding, classification, skill extraction tasks

### ML Service (Task 16)
- `nova/services/ml-service/__init__.py` — Flask app with /embeddings, /classify, /skills/extract
- `nova/services/ml-service/schemas/ml.py` — Pydantic contracts for embeddings, classification, skill extraction

### Labs (Tasks 19-20)
- `labs/lab02/run_lab.py` — Tests: malformed PDF rejected, oversized rejected, every field has span, low confidence surfaces review
- `labs/lab02/package.json` — Python lab deps
- `labs/lab03/run_lab.py` — Tests: 403 on denied call, parser cannot reach Postgres, no egress, no DB creds
- `labs/lab03/package.json` — Python lab deps
- `labs/registry.yaml` — Labs 2 & 3 marked implemented with test commands

### CI Updates
- `.github/workflows/labs.yml` — Runs Labs 1, 2, 3 (Python labs use pip install + python run_lab.py)

## Verification

- All schema validation passes (Pydantic v2 extra="forbid")
- Flask app factory creates with health endpoints
- Parser registry routes by MIME type and extension
- Quarantine validates size, extension, MIME, magic bytes
- PDF parser extracts with page/span provenance
- DOCX parser extracts paragraphs and tables with provenance
- CSV/XLSX parser extracts columns and rows with provenance
- TXT parser detects bank statements with row/column refs
- RQ worker enqueues parse jobs with timeouts and dead letter
- Storage uses content-addressed keys (SHA-256)
- Dockerfile runs as non-root (appuser), drops capabilities
- Inference worker calls ML service via HTTP
- ML service provides embeddings, classification, skill extraction endpoints
- Lab 2 tests: malformed PDF rejected, oversized rejected, every field has span, low confidence -> NEEDS_REVIEW
- Lab 3 tests: 403 on internal endpoint, parser network isolation, no egress, no DB creds
- Labs registry updated: Labs 2 & 3 status=implemented
- CI workflow runs all 3 labs

## Layout Updates

- Added new directories: `nova/services/document-service/`, `nova/workers/inference-worker/`, `nova/services/ml-service/`, `labs/lab02/`, `labs/lab03/`
- Layout checker counts updated (will run to verify)