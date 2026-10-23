# Backend Python

## Chosen (spec:432)

**Flask app factory with blueprints**

## Rationale

- Required for document and ML HTTP services.
- Use app factory/blueprints for modular structure.
- Pydantic v2 for schemas.
- Strict upload limits.
- Production WSGI server (not `flask run`).
- Keep CPU/GPU inference out of request workers where it is long-running; enqueue jobs.

## Rejected

| Option | Reason |
|--------|--------|
| FastAPI | Spec:1011 supersedes "FastAPI-based". Flask with Pydantic provides equivalent validation without the async framework overhead for short-lived request workers. |
| Django | Overkill for the isolated document/ML services. Flask's simplicity matches the single-responsibility worker pattern. |

## Re-check

Record re-check date in `claims-ledger.md` before relying on this row.