# Module 06 — Document and ML sandbox

Phase P3. Spec headings: sandboxed ML and document processing, trust boundaries, fabricated-output defenses, injection defenses.

## Goal

The service quarantines each upload. It parses the file in a sandbox. Every field returns a source span. A field without evidence carries an unknown state.

## Constraints (spec, binding)

Each bullet names the spec line it quotes. Quote marks mean verbatim text.

- Spec:805: "uploaded resumes/statements, attachments, email bodies, job descriptions, webpages and chat may contain hostile instructions."
- The parser runs non-root. It holds no DB credentials. It holds no cloud credentials. It mounts no writable host path. A read-only root filesystem wraps it. The sandbox bounds its temp space. The sandbox restricts its egress.
- Spec:810: "It reads only a single authorized input object and writes only to a scoped result destination."
- Spec:820: "Do not accept a model-supplied citation as real: citation IDs must resolve to fetched source records and source spans."
- Spec:822: "Use deterministic arithmetic for finance totals, scoring hard filters, due-time scheduling, currency/date conversion, permission decisions and job-application state transitions."
- Model and parser workloads never receive DB secrets, a shell, or general egress.

## Extraction envelope

Every field carries all of the following:
- Raw object hash.
- Parser or model version.
- `field_name` and `value`.
- `source_ref`.
- `confidence`, or an uncertainty state.
- `review_status`.

High-impact facts need evidence or user confirmation when uncertain. High-impact facts are degree, employer, dates, money and work authorisation.

## Build sequence

| # | Task | Artifact | Test | Hrs |
|---|---|---|---|---|
| 1 | Write the Pydantic v2 contracts: `ParsedDocument`, extraction envelope, settings | `services/document-service/schemas/` | Extra field fails | 6 |
| 2 | Build the Flask app factory with blueprints, upload limits and error handlers | `services/document-service/` | Oversized upload rejected | 5 |
| 3 | Serve with a production WSGI server, never `flask run` | `Dockerfile` | Process model verified | 3 |
| 4 | Add quarantine: file object ID, SHA-256, type and size limits, page limits | ingest | A crafted extension is rejected | 5 |
| 5 | PDF extraction with PyMuPDF or pdfplumber, page and span provenance | parser | Every field maps to a page and span | 8 |
| 6 | DOCX extraction with python-docx, paragraph provenance | parser | Table cells keep their source | 5 |
| 7 | CSV and XLSX with pandas, column provenance | parser | Encoding and locale variants pass | 6 |
| 8 | TXT and bank statement paths | parser | Statement rows keep row and column refs | 5 |
| 9 | OCR as an isolated fallback only when native text is insufficient | worker | Low confidence is surfaced, not hidden | 8 |
| 10 | Provision the RQ worker runtime on Redis. Keep it separate from the Flask web workers. Add task timeouts and a dead-letter path (spec:433). | `workers/document-worker/` | A parser job runs in the worker process, and the Flask process holds no parser library | 5 |
| 11 | Route parsing through a queue worker, not the request worker | worker | Request worker holds no parser library | 5 |
| 12 | Sandbox the worker: non-root, read-only root, tmpfs, dropped capabilities, seccomp, resource limits | `Dockerfile`, Compose | Escape fixture fails | 8 |
| 13 | Prove the worker cannot reach Postgres or the internet | Compose test | Connection attempts fail | 4 |
| 14 | Reject encrypted, invalid, oversized and scanned-beyond-limit fixtures | fixture corpus | Each fixture fails safely | 5 |
| 15 | Store the parsed result object and return the pointer | storage | Result is content-addressed | 4 |
| 16 | Wire `workers/inference-worker/` and its `services/ml-service/` API for classification and embeddings under the same sandbox rules | `workers/inference-worker/` | Same isolation tests pass | 6 |
| 17 | Reject citation IDs that do not resolve to a stored span | validator | Fabricated citation fails | 4 |
| 18 | Scan uploads for malware where tooling is available, before parse | ingest + worker | An infected fixture is quarantined, not parsed (spec:518) | 5 |
| 19 | Deliver the parser half of curriculum lab 2: upload to Flask parser to evidence-linked profile. `12-jobs-agent` adds the review view in P8. | `labs/lab02/` | Malformed and large inputs are rejected, and every field carries its span | 5 |
| 20 | Deliver curriculum lab 3: parser behind an authenticated internal endpoint, two identities, one allowed call and one denied | `labs/lab03/` | The denied call returns 403 and the parser cannot reach Postgres | 4 |
| 21 | Run the NLP extraction step over parsed text: skills and experience, each carrying the source span it came from | `services/ml-service/resume/` | Every extracted skill resolves to a stored span, and an unsupported field stays unknown (spec:224, spec:520) | 5 |
This build sequence sums to 111 hours.

## Build order

Work these steps in order. A step names tasks from the table above. At 40 hours per week a phase spans several weeks, so a step may run into the next week.

1. Write the Pydantic contracts and the Flask app factory.
2. Build quarantine and the PDF parser with spans.
3. Move parsing into a sandboxed queue worker.

## Acceptance tests

- `test_encrypted_pdf_rejected` — a password-protected file returns a typed error, not a crash.
- `test_oversized_upload_rejected` — the limit holds at the ingress and the worker.
- `test_every_field_has_a_source_span` — no field returns without `source_ref` or an unknown state.
- `test_low_confidence_surfaces_review` — OCR below threshold sets `review_status`.
- `test_worker_cannot_reach_database` — the network layer refuses the connection.
- `test_worker_has_no_egress` — the network layer refuses every outbound connection.
- `test_fabricated_citation_rejected` — an invented document ID fails validation.
- `test_parser_rejects_active_content` — the parser keeps embedded scripts inert and never executes them.

## Risks

- Parser libraries are a memory-safety surface. Pin versions and scan images. Isolation is the control, not the patch level.
- OCR quality varies. Never let a low-confidence value reach finance totals without review.
- Deterministic arithmetic must live in application code, not in a model. A model may summarise a total, never produce it.
