# 2026-10-21 — Add the service skeleton template

## Goal

Land module 01 task 3. Write the service skeleton template. The template must build and serve `/health/live`.

## What changed

- Added `nova/services/_template/python/`. It holds a Flask app factory, the settings, the health endpoints, the JSON log format, a test that serves `/health/live`, pinned requirements, a tool config and a Dockerfile.
- Added `nova/services/_template/typescript/`. It holds the settings, the health endpoints, the service, the process entry point, a test that serves `/health/live`, a lock file, a `tsconfig.json` and a Dockerfile.
- The Python template runs under gunicorn. The spec forbids `flask run`.
- Each template test drives the real service. The Python test binds a socket and calls the endpoint over HTTP. The TypeScript test starts the server on an ephemeral port and calls it with `fetch`.
- The Python template pins every runtime dependency and every test dependency.
- The TypeScript template uses the Node built-in HTTP server and the Node test runner. The only dependencies are the compiler and the Node types.
- The TypeScript template compiles with `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- Both Dockerfiles use a pinned base image digest, a multi-stage build and a non-root runtime user.
- `.github/workflows/ci.yml`: added a Node setup step, a step that tests the Python template and a step that builds and tests the TypeScript template.
- `ci_checks.py`: check AA now requires the template commands and the two template paths.
- `ignored_paths.py`: the template roots are package roots. The build output of the templates is ignored.
- `.gitignore`: added the scoped patterns for the template roots.
- `tree_checks.py`: added the `TEMPLATE_DIRECTORY` constant. The tree now holds 61 directories, 47 leaf directories and 43 placeholders.
- `record_paths.py`: the sixth path group names the service template.
- `nova/docs/layout-diff.md`: the record states six path groups and the new tree counts.
- `repo.md`: updated the tree counts.

## Design decisions

- The template holds both stacks. Most catalogue services are TypeScript. The document and ML services are Python and Flask. One template per stack.
- The template carries its own tool config. A copied service lints and typechecks itself with the same rules as the repository.
- The proof lives in the template. Each template holds a test that calls `/health/live`. The CI workflow runs both.
- The Docker build is not part of this task. The image build belongs to module 01 task 14. The template carries a Dockerfile so that a copied service starts from a working one.
- The TypeScript template has no runtime dependency. The service uses the Node built-in HTTP server.
- The template directories sit under `services/`, so the layout diff table needs no row. The record states them as a path group.

## Verification

- `python -m pytest` in the Python template passes four tests.
- `npm run build` in the TypeScript template compiles. `npm test` passes four tests.
- A mutation that stops the TypeScript service from answering the health path fails two tests.
- `ruff check .` passes over the whole repository, the template included.
- `mypy nova/tests/layout` passes on the 21 checker modules.
- `python3 nova/tests/layout/check_layout.py` passes all 27 checks.
- `python3 nova/tests/layout/test_layout_checks.py` rejects all 64 mutations. The four acceptance scenarios pass.
- The tree counts stay at 61 directories, 47 leaf directories and 43 placeholders.

## Open items

- The CI workflow runs the Node steps now. The steps for the web app land with module 01 task 15.
- The Docker image build runs at module 01 task 14.
