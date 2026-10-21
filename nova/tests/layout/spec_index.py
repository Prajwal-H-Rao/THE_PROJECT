"""Index the NOVA spec. Provides the catalogue entries and the repository layout."""

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
SPEC_PATH = REPO_ROOT / "NOVA_Full_Updated_Spec.md"
TREE_ROOT = REPO_ROOT / "nova"
PLAN_DIR = REPO_ROOT / "docs" / "plan"

# The path of the layout diff record inside the tree.
RECORD_PATH = "docs/layout-diff.md"

CATALOGUE_HEADING = "## Microservice Catalogue, Contracts and Ownership"
LAYOUT_HEADING = "## Repository and Local Deployment Layout"
DEPLOYABLE_ROOTS = ("services", "workers")
WEB_APP = "apps/web"


def spec_lines():
    """Return the spec text as a list of lines."""
    return SPEC_PATH.read_text(encoding="utf-8").splitlines()


def heading_positions(lines):
    """Return the index of every level two heading."""
    return [i for i, line in enumerate(lines) if line.startswith("## ")]


def section_bounds(lines, heading):
    """Return the start and the end index of the section under a heading."""
    headings = heading_positions(lines)
    for position, index in enumerate(headings):
        if lines[index] == heading:
            end = headings[position + 1] if position + 1 < len(headings) else len(lines)
            return index, end
    raise ValueError("the spec has no heading: " + heading)


def row_cells(line):
    """Return the cells of a markdown table row, or an empty list."""
    if not line.startswith("|"):
        return []
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def catalogue_entries(lines):
    """Return the catalogue name and its spec line number for each catalogue row."""
    start, end = section_bounds(lines, CATALOGUE_HEADING)
    entries = {}
    for index in range(start, end):
        cells = row_cells(lines[index])
        if not cells or cells[0] == "Service" or set(cells[0]) <= {"-"}:
            continue
        match = re.search(r"`([^`]+)`", cells[0])
        if match:
            entries[match.group(1)] = index + 1
    return entries


def fence_bounds(lines):
    """Return the first and the last index of the layout fence."""
    start, end = section_bounds(lines, LAYOUT_HEADING)
    opened = next(i for i in range(start, end) if lines[i].strip().startswith("```text"))
    closed = next(i for i in range(opened + 1, end) if lines[i].strip() == "```")
    return opened + 1, closed


def walk_fence(lines):
    """Return each fence path with its spec line number and its kind."""
    first, last = fence_bounds(lines)
    found = []
    stack: list[str] = []
    for index in range(first, last):
        raw = lines[index]
        text = raw.split("#", 1)[0].rstrip()
        if not text.strip():
            continue
        depth = (len(raw) - len(raw.lstrip())) // 2
        parts = stack[:depth] + [text.strip().rstrip("/")]
        stack = parts
        found.append(("/".join(parts[1:]), index + 1, text.strip().endswith("/")))
    return found


def layout_directories(lines):
    """Return the layout directories with their spec line numbers."""
    return {path: number for path, number, is_dir in walk_fence(lines) if is_dir}


def layout_files(lines):
    """Return the layout files with their spec line numbers."""
    return {path: number for path, number, is_dir in walk_fence(lines) if not is_dir}


def implied_parents(directories, files):
    """Return the layout parents that the fence names only through a child path."""
    named = set(directories)
    parents = set()
    for path in list(directories) + list(files):
        parts = path.split("/")
        for depth in range(1, len(parts)):
            parent = "/".join(parts[:depth])
            if parent and parent not in named:
                parents.add(parent)
    return parents


def is_deployable(path):
    """Return True when a layout path is a deployable unit."""
    parts = path.split("/")
    if len(parts) == 2 and parts[0] in DEPLOYABLE_ROOTS:
        return True
    return path == WEB_APP


def deployable_paths(directories):
    """Return the deployable layout paths."""
    return sorted(path for path in directories if is_deployable(path))


def unmatched_names(catalogue, deployables):
    """Return the catalogue names that match no deployable layout path."""
    basenames = {path.rsplit("/", 1)[-1] for path in deployables}
    return sorted(name for name in catalogue if name not in basenames)


def unmatched_paths(deployables, catalogue):
    """Return the deployable layout paths that match no catalogue name."""
    return sorted(path for path in deployables if path.rsplit("/", 1)[-1] not in catalogue)


class SpecIndex:
    """The catalogue entries, the layout paths and every derived set."""

    def __init__(self):
        """Read the spec and derive every set that the checks need."""
        lines = spec_lines()
        self.lines = lines
        self.tree_root = TREE_ROOT
        self.catalogue = catalogue_entries(lines)
        self.layout_directories = layout_directories(lines)
        self.layout_files = layout_files(lines)
        self.implied_parents = implied_parents(self.layout_directories, self.layout_files)
        self.deployables = deployable_paths(self.layout_directories)
        self.unmatched_names = unmatched_names(self.catalogue, self.deployables)
        self.unmatched_paths = unmatched_paths(self.deployables, self.catalogue)
        self.known_lines = set(self.catalogue.values())
        self.known_lines |= set(self.layout_directories.values())
        self.known_lines |= set(self.layout_files.values())

    def line_text(self, number):
        """Return the text of a spec line, or an empty string."""
        if 1 <= number <= len(self.lines):
            return self.lines[number - 1]
        return ""
