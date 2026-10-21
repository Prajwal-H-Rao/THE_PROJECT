# The Python service template

Copy this directory to `services/<service-name>/` and rename the `app` package.

## What it holds

- `app/__init__.py` — the app factory. It builds the application and registers the blueprints.
- `app/config.py` — the settings. The environment supplies the values with the `NOVA_` prefix.
- `app/health.py` — the health endpoints. They leak no secret.
- `app/logging_setup.py` — the JSON log format. Every line carries the same fields.
- `tests/test_health.py` — the test that proves the service serves `/health/live`.
- `Dockerfile` — the image. The build is multi-stage and the runtime user is not root.

## How to run it

```bash
python -m pip install -r requirements.txt -r requirements-dev.txt
python -m pytest
gunicorn --bind 0.0.0.0:8000 "app:create_app()"
```

## How to check it

```bash
ruff check .
mypy app tests
```

The CI workflow runs the same three commands. The module that owns the service keeps the
commands in step with the repository.
