"""Index the NOVA build plan. Provides the task numbers, the task rows and the plan text."""

import re
from pathlib import Path

BUILD_SEQUENCE = "## Build sequence"
MODULE_FILE = re.compile(r"^(\d{2})-")
BACKTICK = re.compile(r"`([^`]+)`")

# The plan task row that states the row count and the split of the layout diff.
DIFF_MODULE = "01"
DIFF_TASK = 1
ROW_COUNT = re.compile(r"exactly (\d+) rows")
ROW_SPLIT = re.compile(r"(\d+) catalogue-only, (\d+) layout-only and (\d+) renamed")

# The plan task row that states the service count of the service map.
SERVICE_MODULE = "01"
SERVICE_TASK = 16
SERVICE_REQUIREMENT = re.compile(r"Each of the (\d+) catalogue services appears exactly once")


def owned_path(token):
    """Return a plan token as a path under nova/, or an empty string."""
    text = token.strip().rstrip("/")
    if not text or " " in text:
        return ""
    if text.startswith("nova/"):
        text = text[len("nova/"):]
    return text


def owned_paths(plan_dir):
    """Return every path that a build sequence task names."""
    owned = set()
    for number, path in module_files(plan_dir):
        for task, text in build_sequence_rows(path):
            for token in BACKTICK.findall(text):
                owned.add(owned_path(token))
    return {path for path in owned if path}


def module_files(plan_dir):
    """Return the module number and the path of every module file."""
    found = []
    for path in sorted(Path(plan_dir).glob("*.md")):
        match = MODULE_FILE.match(path.name)
        if match:
            found.append((match.group(1), path))
    return found


def build_sequence_table(path):
    """Return the cells of every build sequence task row."""
    lines = Path(path).read_text(encoding="utf-8").splitlines()
    start = None
    for index, line in enumerate(lines):
        if line.strip() == BUILD_SEQUENCE:
            start = index
            break
    if start is None:
        return []
    rows = []
    for line in lines[start + 1:]:
        # The build sequence ends at the next heading, so other tables do not count.
        if line.startswith("## "):
            break
        if not line.startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if not cells or not cells[0].isdigit():
            continue
        rows.append(cells)
    return rows


def build_sequence_rows(path):
    """Return the task number and the row text of every build sequence task."""
    return [(int(cells[0]), " ".join(cells[1:])) for cells in build_sequence_table(path)]


def task_numbers(path):
    """Return the task numbers in the build sequence table of a module file."""
    return {number for number, text in build_sequence_rows(path)}


def task_index(plan_dir):
    """Return the build sequence task numbers for every module."""
    return {number: task_numbers(path) for number, path in module_files(plan_dir)}


def task_texts(plan_dir):
    """Return the row text of every build sequence task, keyed by module and number."""
    texts = {}
    for number, path in module_files(plan_dir):
        texts[number] = {task: text for task, text in build_sequence_rows(path)}
    return texts


def plan_text(plan_dir):
    """Return the full text of every plan file."""
    parts = []
    for path in sorted(Path(plan_dir).glob("*.md")):
        parts.append(path.read_text(encoding="utf-8"))
    return "\n".join(parts)


def task_test_cell(plan_dir, module, task):
    """Return the test cell of one build sequence task, or an empty string."""
    for number, path in module_files(plan_dir):
        if number != module:
            continue
        for cells in build_sequence_table(path):
            if int(cells[0]) == task and len(cells) > 3:
                return cells[3]
    return ""


def diff_row_expectation(plan_dir):
    """Return the row count and the split that the plan task row states."""
    text = task_test_cell(plan_dir, DIFF_MODULE, DIFF_TASK)
    count = ROW_COUNT.search(text)
    split = ROW_SPLIT.search(text)
    if count is None or split is None:
        return None, None
    kinds = {
        "catalogue-only": int(split.group(1)),
        "layout-only": int(split.group(2)),
        "renamed": int(split.group(3)),
    }
    return int(count.group(1)), kinds


def service_requirement(plan_dir):
    """Return the service count that the plan task row requires, or None."""
    text = task_test_cell(plan_dir, SERVICE_MODULE, SERVICE_TASK)
    count = SERVICE_REQUIREMENT.search(text)
    if count is None:
        return None
    return int(count.group(1))
