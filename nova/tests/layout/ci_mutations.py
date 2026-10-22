"""Define the mutations that change the CI workflow in a work directory."""

from pathlib import Path

import ci_checks

WORKFLOW = ci_checks.WORKFLOW_PATH
CONFIG = ci_checks.CONFIG_PATH


def read_file(work, relative):
    """Return the text of a file in a work directory."""
    path = Path(work) / relative
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8")


def write_file(work, relative, text):
    """Write a file in a work directory."""
    path = Path(work) / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def replace_in_work(work, relative, old, new):
    """Replace a string in a file of a work directory."""
    text = read_file(work, relative)
    if old not in text:
        return False
    write_file(work, relative, text.replace(old, new))
    return True


def remove_typecheck_step(work):
    """Remove the typecheck step from the CI workflow."""
    return replace_in_work(
        work, WORKFLOW,
        "      - name: Typecheck the Python code\n        run: mypy nova\n",
        "")


def unpin_ruff(work):
    """Remove the pinned version of ruff from the CI workflow."""
    return replace_in_work(work, WORKFLOW, "ruff==0.17.1", "ruff")


def drop_tool_config(work):
    """Remove the tool config from the work directory."""
    path = Path(work) / CONFIG
    if not path.is_file():
        return False
    path.unlink()
    return True


def add_continue_on_error(work):
    """Let the typecheck step fail without failing the job."""
    return replace_in_work(
        work, WORKFLOW,
        "      - name: Typecheck the Python code\n",
        "      - name: Typecheck the Python code\n        continue-on-error: true\n")


def add_path_filter(work):
    """Skip the workflow for most paths."""
    return replace_in_work(
        work, WORKFLOW,
        "  pull_request:\n",
        "  pull_request:\n    paths:\n      - 'docs/**'\n")


def remove_push_trigger(work):
    """Remove the push trigger from the workflow."""
    return replace_in_work(
        work, WORKFLOW,
        "  push:\n    branches: [main]\n",
        "")


def gut_proof_step(work):
    """Remove the body of the proof step."""
    return replace_in_work(
        work, WORKFLOW,
        "          if [ \"$status\" -ne 1 ]; then\n",
        "          if false; then\n")


def drift_typecheck_scope(work):
    """Make the workflow typecheck a path that the config does not hold."""
    return replace_in_work(
        work, WORKFLOW,
        "        run: mypy nova\n",
        "        run: mypy nova/services\n")


def proof_scope_drift(work):
    """Make the proof step typecheck another scope than the gate."""
    return replace_in_work(
        work, WORKFLOW,
        "output=$(mypy nova 2>&1)",
        "output=$(mypy nova/services 2>&1)")


def comment_bypass(work):
    """Write a comment that names a bypass marker."""
    return replace_in_work(
        work, WORKFLOW,
        "      - name: Lint the Python code\n",
        "      # TODO: consider paths: filters later\n      - name: Lint the Python code\n")


def widen_typecheck_scope(work):
    """Widen the typecheck scope in the workflow and in the config."""
    if not replace_in_work(
        work, WORKFLOW,
        "        run: mypy nova\n",
        "        run: mypy nova/services\n"):
        return False
    replace_in_work(work, WORKFLOW, "output=$(mypy nova 2>&1)", "output=$(mypy nova/services 2>&1)")
    return replace_in_work(
        work, CONFIG, 'files = ["nova"]', 'files = ["nova/services"]')


def remove_gateway_step(work):
    """Remove the gateway step from the CI workflow."""
    return replace_in_work(
        work, WORKFLOW,
        "      - name: Build and test the api-gateway\n"
        "        run: |\n"
        "          cd nova/services/api-gateway\n"
        "          npm ci\n"
        "          npm run build\n"
        "          npm run build:test\n"
        "          npm test\n",
        "")
