# NOVA testing guide

This module covers every test suite, how to run it, and what it proves.

## Layout checker

The tree checker validates the `nova/` directory against the record
`nova/docs/layout-diff.md`, the plan files in `docs/plan/`, and the spec.

Run:

```bash
python nova/tests/layout/check_layout.py
```

28 checks (A–AB). All pass on the current tree: 208 directories, 133 leaf
directories, 43 `.gitkeep` placeholders.

Run the mutation suite to prove each check rejects a bad tree:

```bash
python nova/tests/layout/test_layout_checks.py
```

74 mutation cases. All reject. CI runs both commands at
`.github/workflows/ci.yml`.

## Security tests

`nova/tests/security/` holds the database and object isolation tests:

- `test_database_isolation.py` — database role isolation.
- `test_object_prefix_isolation.py` — object prefix isolation.
- `test_event_delivery.py` — event delivery.
- `sigv4_request.py` — signed request helper.

These run under the `--profile test` compose shape with `object-init` and
`tests` services.

## Model evaluation

`nova/tests/model-eval/` holds `run_eval.py`, `test_lab11.py`,
`test_llamacpp_fallback.py`, and a `tests/` directory. These cover local model
runs and llama.cpp fallback.

## Red team

`nova/tests/red-team/` holds `ci_config.py` and `test_red_team.py`. These cover
adversarial checks against the stack.

## Contracts, e2e

`nova/tests/contracts/` and `nova/tests/e2e/` exist as directories but hold no
test files.

## Python lint and typecheck

CI runs `ruff check .` and `mypy nova` (pinned `ruff==0.17.1`,
`mypy==1.11.0`). These steps are not testable locally because the local pip is
broken.

## CI workflow

`.github/workflows/ci.yml` runs:

- layout checks (checker + mutation suite).
- lint and typecheck.
- template test suites.
- contracts build and test.
- api-gateway build and test, plus the image proof (non-root, no secret values).
- HTTPS edge proof.
- compose isolation suites.
- queue restart test with trace-span compare.
- network guard test.
- backup/restore drill.

## Write new tests

- Layout mutations go in `nova/tests/layout/mutations.py` or
  `record_mutations.py`, registered in `cases.py`.
- Security suites go in `nova/tests/security/`.
- Keep every test under the 200-line file rule. Split modules first.
