# Change — 2026-11-06-p3-m06-t16-inference-worker-sandbox

## Problem

Task 06.16 (module 06, P3): wire `workers/inference-worker/` and its `services/ml-service/` API for classification and embeddings under the same sandbox rules. Artifact: `workers/inference-worker/`. Test: "Same isolation tests pass" — mirrors task 06.12's test_sandbox.py. ml-service Flask app already exposes /api/v1/embeddings, /api/v1/classify, /api/v1/skills/extract; inference-worker already enqueues embedding/classification/skill-extraction RQ tasks. Missing: the sandbox artifacts (Dockerfile, Compose, seccomp) and their proof test.

## Changes (mirrors task 06.12 exactly)

- Added `nova/workers/inference-worker/Dockerfile`: pinned `python:3.12-slim` base, queue runtime only (`rq`, `redis`, `httpx`; model weights load in ml-service image, not here), non-root `USER inferenceworker`, RQ worker entrypoint on queue `ml_inference`.
- Added `nova/workers/inference-worker/sandbox-compose.yaml`: `read_only: true`, bounded tmpfs (`/tmp:rw,noexec,nosuid,size=64m`), `cap_drop: [ALL]`, `no-new-privileges:true` plus seccomp profile, `mem_limit: 512m`, `cpus: "1.0"`, `pids_limit: 64`, empty volume list (no Docker socket, no host mount, spec:692 and spec:814).
- Added `nova/workers/inference-worker/seccomp-worker.json`: deny profile blocking `mount`, `umount2`, `unshare`, `setns`, `keyctl`, `add_key`, `request_key`, `ptrace`, `personality`.
- Added `nova/workers/inference-worker/test_sandbox.py`: stdlib-only test reading all three artifacts. Asserts every sandbox directive is present, asserts the escape paths (Docker socket, database route, writable host mount) are absent, asserts the seccomp profile denies the signature setting calls. Runs with plain python3; passes.
- Registered the `workers/inference-worker` prefix in `EXTRA_DIRECTORY_PREFIXES` (`nova/tests/layout/tree_checks.py`, sorted right after `workers/document-worker`) and in the allow-list sentence (`nova/docs/layout-diff.md`), prefix only, no file path, keeping check Q's stated list equal to `sorted(EXTRA_DIRECTORY_PREFIXES)`.

## Verification

- `python3 nova/workers/inference-worker/test_sandbox.py` → PASS.
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass (A–AB). Tree counts unchanged: 180 directories, 111 leaf directories, 43 placeholders.

## Notes

Task 06.16 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 06 now 17 done / 1 partial / 3 open; P3 now 33 done / 1 partial / 3 open (89%); totals 221 done / 19 partial / 163 open (55%). Partial retained because 06.14 remains partial (deterministic page enforcement lands at 06.5/06.16 parser side). Next P3 tasks top-to-bottom: 06.13 (no Postgres route / no egress), 06.17 (citation validator), 06.18 (malware scan), 06.21 (skills/experience extraction).

No commit made (commit decision belongs to the owner).
