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


def remove_step(work, step_name):
    """Remove one workflow step block, from its name line to the next name line."""
    text = read_file(work, WORKFLOW)
    marker = "      - name: " + step_name + "\n"
    start = text.find(marker)
    if start < 0:
        return False
    following = text.find("\n      - name: ", start + 1)
    # WHY: a last step has no following name line. Its block runs to the file end.
    end = len(text) if following < 0 else following + 1
    write_file(work, WORKFLOW, text[:start] + text[end:])
    return True


def remove_typecheck_step(work):
    """Remove the typecheck step from the CI workflow."""
    return remove_step(work, "Typecheck the Python code")


def remove_gateway_step(work):
    """Remove the gateway step from the CI workflow."""
    return remove_step(work, "Build and test the api-gateway")


def remove_database_step(work):
    """Remove the compose isolation step from the CI workflow."""
    return remove_step(work, "Test the database and object isolation suites")


def remove_contracts_step(work):
    """Remove the contracts step from the CI workflow."""
    return remove_step(work, "Build the shared contracts before the gateway step reads them")


def remove_queue_step(work):
    """Remove the queue restart step from the CI workflow."""
    return remove_step(work, "Test that the queue job survives the broker restart")


def remove_guard_step(work):
    """Remove the network guard step from the CI workflow."""
    return remove_step(work, "Test the default-deny network rule")


def remove_edge_step(work):
    """Remove the HTTPS edge step from the CI workflow."""
    return remove_step(work, "Test the HTTPS edge")


def remove_platform_file(work):
    """Drop the compose.platform.yaml file from every compose command."""
    text = read_file(work, WORKFLOW)
    if " -f nova/infra/compose/compose.platform.yaml" not in text:
        return False
    write_file(work, WORKFLOW,
               text.replace(" -f nova/infra/compose/compose.platform.yaml", ""))
    return True


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
