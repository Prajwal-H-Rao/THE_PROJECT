# Change — 2026-11-06-p3-m06-t12-worker-sandbox

## Problem

Task 06.12 (module 06, P3): prove the worker sandbox — non-root, read-only root, tmpfs, dropped capabilities, seccomp, resource limits. Artifact: `Dockerfile`, Compose. Test: "Escape fixture fails". `nova/workers/document-worker/` held only the `.gitkeep` placeholder. No Docker runtime exists in this environment, so the proof must be a static artifact check.

## Changes

- Added `nova/workers/document-worker/Dockerfile`: pinned `python:3.12-slim` base, queue runtime only (`rq`, `redis`; parser libraries arrive in task 06.10), non-root `USER docworker`, queue-worker entrypoint.
- Added `nova/workers/document-worker/sandbox-compose.yaml`: `read_only: true`, bounded tmpfs (`/tmp:rw,noexec,nosuid,size=64m`), `cap_drop: [ALL]`, `no-new-privileges:true` plus the shipped seccomp profile, `mem_limit: 512m`, `cpus: "1.0"`, `pids_limit: 64`, and an empty volume list (no Docker socket, no host mount, spec:692 and spec:814).
- Added `nova/workers/document-worker/seccomp-worker.json`: small deny profile blocking `mount`, `umount2`, `unshare`, `setns`, `keyctl`, `add_key`, `request_key`, `ptrace`, `personality`.
- Added `nova/workers/document-worker/test_sandbox.py`: stdlib-only test reading all three artifacts. Asserts every sandbox directive is present, asserts the escape paths (Docker socket, database route, writable host mount) are absent, asserts the seccomp profile denies the signature setting calls. One directive-string fix during writing: the YAML literal is `- ALL`, not `::ALL`.
- Registered the `workers/document-worker` prefix in `EXTRA_DIRECTORY_PREFIXES` (`nova/tests/layout/tree_checks.py`, appended) and in the allow-list sentence of `nova/docs/layout-diff.md` (prefix only, no file path), keeping check Q's stated list equal to `sorted(EXTRA_DIRECTORY_PREFIXES)`.

## Approach sign-off

- Two negation subagents reviewed the approach in parallel. Both returned "no blocking objections, approach is sound". One correction adopted: the files live under `nova/workers/document-worker/` (the checker audits only the `nova/` tree), and `.gitkeep` stays so the placeholder count does not move.

## Verification

- `python3 nova/workers/document-worker/test_sandbox.py` → PASS.
- `python3 nova/tests/layout/check_layout.py` → all 28 checks pass (A–AB). Tree counts unchanged: 180 directories, 111 leaf directories, 43 placeholders.

## Notes

Task 06.12 marked done; checkbox ticked in `docs/plan/worklist.md`. Module 06 now 14 done / 2 partial / 5 open; P3 now 30 done / 2 partial / 5 open (81%); totals 218 done / 20 partial / 165 open. Network reachability proof (worker cannot reach Postgres or the internet) is task 06.13, not this task.

No commit made (commit decision belongs to the owner).
