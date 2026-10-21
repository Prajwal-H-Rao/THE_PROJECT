"""Check the CI workflow. Verify the triggers, the gates and the proof step."""

import re
from pathlib import Path

WORKFLOW_PATH = Path(".github") / "workflows" / "ci.yml"
CONFIG_PATH = Path("pyproject.toml")

# The commands that the workflow must run.
LAYOUT_COMMANDS = (
    "nova/tests/layout/check_layout.py",
    "nova/tests/layout/test_layout_checks.py",
)

# The tools that the workflow must pin and run.
TOOLS = ("ruff", "mypy")

# The Python version that the workflow must use.
PYTHON_VERSION = "3.12"

# The triggers that the workflow must carry.
REQUIRED_TRIGGERS = ("push:", "pull_request:")

# The permission that the workflow must grant.
REQUIRED_PERMISSION = "contents: read"

# The markers that would let the workflow skip work.
BYPASS_MARKERS = ("continue-on-error", "paths:")

# The markers that the proof step must carry.
PROOF_MARKERS = ("type_error_proof.py", "-ne 1")

# The commands that the workflow must carry.
REQUIRED_COMMANDS = (
    "run: ruff check .",
    "run: mypy ",
    "python -m pytest -q",
    "npm ci",
    "npm run build",
    "npm test",
)

# The paths that the template commands must name.
TEMPLATE_PATHS = (
    "nova/services/_template/python",
    "nova/services/_template/typescript",
)

# The scope of the typecheck in the workflow and in the config.
MYPY_SCOPE = re.compile(r"mypy (\S+)")
CONFIG_FILES = re.compile(r"files = \[\"([^\"]+)\"\]")


def workflow_path(repo_root):
    """Return the path of the CI workflow inside a repo root."""
    return repo_root / WORKFLOW_PATH


def config_path(repo_root):
    """Return the path of the tool config inside a repo root."""
    return repo_root / CONFIG_PATH


def workflow_text(repo_root):
    """Return the text of the CI workflow, or an empty string."""
    path = workflow_path(repo_root)
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8")


def workflow_code(repo_root):
    """Return the workflow lines that carry no comment."""
    lines = []
    for line in workflow_text(repo_root).splitlines():
        text = line.split("#", 1)[0].rstrip()
        if text.strip():
            lines.append(text)
    return "\n".join(lines) + "\n"


def check_ci_workflow(repo_root):
    """Check that the CI workflow runs every gate and proves the type error."""
    text = workflow_text(repo_root)
    if not text:
        return "the repo holds no CI workflow at " + WORKFLOW_PATH.as_posix()
    code = workflow_code(repo_root)
    problems = []
    for command in LAYOUT_COMMANDS:
        if command not in text:
            problems.append("the CI workflow does not run " + command)
    for tool in TOOLS:
        if not pinned(text, tool):
            problems.append("the CI workflow does not pin " + tool)
    for command in REQUIRED_COMMANDS:
        if command not in code:
            problems.append("the CI workflow holds no command " + command.strip())
    for path in TEMPLATE_PATHS:
        if path not in text:
            problems.append("the CI workflow does not test " + path)
    if PYTHON_VERSION not in text:
        problems.append("the CI workflow does not use Python " + PYTHON_VERSION)
    problems += trigger_problems(code)
    problems += bypass_problems(code)
    problems += proof_problems(code)
    problems += config_problems(repo_root)
    if problems:
        return "; ".join(problems)
    return None


def pinned(text, tool):
    """Return True when the text pins a version of one tool."""
    return re.search(re.escape(tool) + r"==\d+\.\d+\.\d+", text) is not None


def trigger_problems(text):
    """Return the problems of the triggers that the workflow carries."""
    problems = []
    for trigger in REQUIRED_TRIGGERS:
        if trigger not in text:
            problems.append("the CI workflow has no " + trigger + " trigger")
    if REQUIRED_PERMISSION not in text:
        problems.append("the CI workflow does not grant " + REQUIRED_PERMISSION)
    return problems


def bypass_problems(text):
    """Return the problems of the markers that would skip work."""
    problems = []
    for marker in BYPASS_MARKERS:
        if marker in text:
            problems.append("the CI workflow holds the bypass marker " + marker)
    return problems


def proof_problems(text):
    """Return the problems of the proof step."""
    problems = []
    for marker in PROOF_MARKERS:
        if marker not in text:
            problems.append("the CI workflow proof step holds no " + marker)
    return problems


def config_problems(repo_root):
    """Return the problems of the tool config."""
    path = config_path(repo_root)
    if not path.is_file():
        return ["the repo holds no tool config at " + CONFIG_PATH.as_posix()]
    text = path.read_text(encoding="utf-8")
    problems = []
    for section in ("[tool.ruff]", "[tool.mypy]"):
        if section not in text:
            problems.append("the tool config holds no " + section)
    if "nova/**/*.py" not in text:
        problems.append("the tool config does not lint the nova/ tree")
    problems += scope_problems(repo_root, text)
    return problems


def scope_problems(repo_root, config_text):
    """Return the problems of a typecheck scope that the workflow and the config disagree on."""
    workflow = workflow_code(repo_root)
    scopes = [match.group(1) for match in MYPY_SCOPE.finditer(workflow)]
    if not scopes:
        return ["the CI workflow holds no mypy command"]
    if len(set(scopes)) > 1:
        return ["the CI workflow typechecks more than one scope: " + ", ".join(sorted(set(scopes)))]
    config = CONFIG_FILES.search(config_text)
    if config is None:
        return ["the tool config holds no mypy file list"]
    if scopes[0] != config.group(1):
        return ["the CI workflow typechecks %s and the tool config holds %s" % (
            scopes[0], config.group(1))]
    return []
