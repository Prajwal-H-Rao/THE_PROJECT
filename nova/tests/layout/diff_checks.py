"""Check the layout diff against the NOVA spec and the NOVA build plan."""

import re

import diff_doc
import tree_checks

ABSENT = "none"

# The four spec items that the plan defers.
DEFERRED_LINES = [438, 677, 831, 951]

# The overlay directory that the plan keeps.
OVERLAY_DIRECTORY = "infra/k8s/overlays"

# The directory that the plan defers. No plan task writes in it.
DEFERRED_DIRECTORY = tree_checks.DEFERRED_DIRECTORY

SPEC_CITE = diff_doc.SPEC_CITE
MODULE_TASK = diff_doc.MODULE_TASK
MODULE_ANY = diff_doc.MODULE_ANY

TOKEN_SPLIT = re.compile(r"[-_]")


def tokens(text):
    """Return the lowercase tokens of a name."""
    return set(TOKEN_SPLIT.split(text.lower()))


def basename(path):
    """Return the last segment of a layout path."""
    return path.rsplit("/", 1)[-1]


def candidate_paths(name, paths):
    """Return the layout paths whose basename tokens fit the name tokens."""
    return [path for path in paths if tokens(basename(path)) <= tokens(name)]


def check_diff_row_count(rows, expected):
    """Check that the layout diff holds the row count that the plan task row states."""
    if expected is None:
        return "the plan task row states no row count"
    if len(rows) != expected:
        return "the layout diff holds %d rows, not %d" % (len(rows), expected)
    return None


def check_diff_split(rows, expected):
    """Check the split of catalogue-only, layout-only and renamed rows."""
    if expected is None:
        return "the plan task row states no split"
    counts = {kind: 0 for kind in expected}
    for row in rows:
        kind = row["Kind"]
        if kind not in counts:
            return "unknown kind: " + kind
        counts[kind] += 1
    if counts != expected:
        return "the split is %s, not %s" % (counts, expected)
    return None


def check_partition(index, rows):
    """Check that the rows close the catalogue and the layout partition."""
    names = sorted(row["Catalogue entry"] for row in rows if row["Kind"] != "layout-only")
    paths = sorted(row["Layout path"] for row in rows if row["Kind"] != "catalogue-only")
    if names != index.unmatched_names:
        return "the catalogue names do not close: %s, not %s" % (names, index.unmatched_names)
    if paths != index.unmatched_paths:
        return "the layout paths do not close: %s, not %s" % (paths, index.unmatched_paths)
    if len(set(names)) != len(names):
        return "a catalogue name appears in more than one row"
    if len(set(paths)) != len(paths):
        return "a layout path appears in more than one row"
    return None


def check_pairing(index, rows):
    """Check that each renamed row uses the only admissible layout path."""
    renamed = [row for row in rows if row["Kind"] == "renamed"]
    problems = []
    for row in renamed:
        candidates = candidate_paths(row["Catalogue entry"], index.unmatched_paths)
        if len(candidates) != 1:
            problems.append("%s has %d candidate paths" % (row["Catalogue entry"], len(candidates)))
        elif candidates[0] != row["Layout path"]:
            problems.append("%s is paired with %s, not %s" % (
                row["Catalogue entry"], row["Layout path"], candidates[0]))
    for name in index.unmatched_names:
        if name in [row["Catalogue entry"] for row in renamed]:
            continue
        candidates = candidate_paths(name, index.unmatched_paths)
        if candidates:
            problems.append("%s has an unused candidate path %s" % (name, candidates[0]))
    if problems:
        return "; ".join(problems)
    return None


def check_note_evidence(index, rows):
    """Check that each row cites the spec lines that define its entries."""
    problems = []
    for number, row in enumerate(rows, 1):
        note = row.get("Note", "")
        cites = {int(value) for value in SPEC_CITE.findall(note)}
        for cite in sorted(cites):
            if cite not in index.known_lines:
                problems.append("row %d cites the unknown line spec:%d" % (number, cite))
        catalogue = row["Catalogue entry"]
        if catalogue != ABSENT:
            line = index.catalogue.get(catalogue)
            if line is None or line not in cites:
                problems.append("row %d does not cite %s at spec:%s" % (number, catalogue, line))
        layout = row["Layout path"]
        if layout != ABSENT:
            line = index.layout_directories.get(layout)
            if line is None or line not in cites:
                problems.append("row %d does not cite %s at spec:%s" % (number, layout, line))
    if problems:
        return "; ".join(problems)
    return None


def check_module_references(text, plan):
    """Check that every module and task reference names a real build sequence task."""
    problems = []
    spans = []
    for match in MODULE_TASK.finditer(text):
        module = match.group(1)
        first = int(match.group(2))
        last = int(match.group(3)) if match.group(3) else first
        spans.append(match.span())
        numbers = plan.get(module)
        if numbers is None:
            problems.append("module %s has no plan file" % module)
            continue
        for number in range(first, last + 1):
            if number not in numbers:
                problems.append("module %s has no task %d" % (module, number))
    for match in MODULE_ANY.finditer(text):
        if not any(start <= match.start() < end for start, end in spans):
            problems.append("module %s names no task number" % match.group(1))
    if problems:
        return "; ".join(problems)
    return None


def check_deferred_note(section, owned):
    """Check that the deferred cloud section names the four deferred spec items."""
    cites = sorted({int(value) for value in SPEC_CITE.findall(section)})
    if cites != sorted(DEFERRED_LINES):
        return "the deferred cloud section cites %s, not %s" % (cites, sorted(DEFERRED_LINES))
    problems = deferral_problems(owned)
    if problems:
        return "; ".join(problems)
    return None


def deferral_problems(owned):
    """Return the problems of the plan paths that the deferral claims forbid."""
    problems = []
    for path in sorted(owned):
        if path == DEFERRED_DIRECTORY or path.startswith(DEFERRED_DIRECTORY + "/"):
            problems.append("a plan task names the deferred directory " + path)
    if not any(path == OVERLAY_DIRECTORY or path.startswith(OVERLAY_DIRECTORY + "/")
               for path in owned):
        problems.append("no plan task names " + OVERLAY_DIRECTORY)
    return problems
