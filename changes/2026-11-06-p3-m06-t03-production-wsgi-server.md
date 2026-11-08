# Change — 2026-11-06-p3-m06-t03-production-wsgi-server

## Problem

Task 06.3 (module 06, P3): serve the Flask app with a production WSGI server, never `flask run`. The document service app factory `run_app()` in `nova/services/document-service/__init__.py` called `app.run(host=..., port=..., debug=...)` — the Flask development server — which is unsuitable for production.

## Changes

- Replaced `app.run()`/`debug=True` in `run_app()` with gunicorn as the production WSGI server (`from gunicorn.app.wsgiapp import WSGIApplication`).
- Added `gunicorn==22.0.0` to `nova/services/document-service/requirements.txt`.
- Wrote a stdlib-only test `nova/services/document-service/test_wsgi_server.py` (runs with plain python3; no flask/gunicorn/pytest installed locally) that reads the app factory source and asserts gunicorn/WSGI is used and `app.run(`/`debug=True` is not. Test passes.
- Registered `services/document-service` in `EXTRA_DIRECTORY_PREFIXES` (`nova/tests/layout/tree_checks.py`) and in the allow-list sentence (`nova/docs/layout-diff.md`) so check P/Q stay green. Directory prefix added in sorted position; no file path added to Q's allow-list sentence.

## Verification

- `python3 test_wsgi_server.py` → PASS.
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass (A–AB). Tree counts unchanged: 180 directories, 111 leaf directories, 43 placeholders.

## Notes

Task 06.3 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 06 now 13 done / 3 partial / 5 open; P3 now 29 done / 3 partial / 5 open (78%).

No commit made (commit decision belongs to the owner).
