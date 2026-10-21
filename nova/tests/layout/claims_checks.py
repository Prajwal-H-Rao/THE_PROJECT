"""Check the claims of the layout diff. Verify the counts and the names that it states."""

import re

import diff_doc
import record_paths
import tree_checks

PY_FILE = re.compile(r"[\w-]+\.py")
ALLOW_LIST_SENTENCE = "The allow-list holds "
OMIT_COUNT = re.compile(r"The tree omits (\d+) file")
BACKTICK = re.compile(r"`([^`]+)`")
SPEC_CITE = re.compile(r"spec:(\d+)")
MODULE_TASK = diff_doc.MODULE_TASK


def count_kind(rows, kind):
    """Return the number of rows of one kind."""
    return len([row for row in rows if row["Kind"] == kind])


def states(section, claim):
    """Return True when a section states a claim."""
    # The claim must not sit inside a longer number.
    return re.search(r"(?<!\w)" + re.escape(claim), section) is not None


def check_scope_claims(index, rows, scope, extra):
    """Check that the scope and extra paths sections state the computed counts."""
    exact = len(index.catalogue) - len(index.unmatched_names)
    placeholders = len(tree_checks.placeholder_files(index.tree_root))
    directories = len(tree_checks.counted_paths(index.tree_root))
    leaves = len(tree_checks.leaf_directories(index.tree_root))
    claims = [
        (scope, "%d entries" % len(index.catalogue)),
        (scope, "%d deployable paths" % len(index.deployables)),
        (scope, "%d units match by exact name" % exact),
        (scope, "%d units match under a different name" % count_kind(rows, "renamed")),
        (scope, "%d catalogue entries have no layout path" % count_kind(rows, "catalogue-only")),
        (scope, "%d layout paths have no catalogue entry" % count_kind(rows, "layout-only")),
        (extra, "%d path groups beyond the spec layout" % len(record_paths.expected_groups(index))),
        (extra, "%d .gitkeep placeholder files" % placeholders),
        (extra, "%d directories below the root" % directories),
        (extra, "%d leaf directories" % leaves),
    ]
    problems = []
    for section, claim in claims:
        if not states(section, claim):
            problems.append("a section does not state " + claim)
    if problems:
        return "; ".join(problems)
    return None


def check_omitted_files(index, section):
    """Check that the record names the files that the tree omits and that the tree omits them."""
    files = omitted_files(section)
    count = stated_omitted_count(section)
    if count is None:
        return "the omitted files section states no count"
    problems = []
    if count != len(files):
        problems.append("the omitted files section states %d files and names %d" % (
            count, len(files)))
    expected = sorted(
        relative for relative in index.layout_files
        if not (index.tree_root / relative).exists()
    )
    if sorted(files) != expected:
        problems.append("the omitted files section names %s, not %s" % (sorted(files), expected))
    for relative in files:
        if (index.tree_root / relative).exists():
            problems.append("the tree holds " + relative)
        if not owner_evidence(section, relative):
            problems.append("the omitted files section gives no owner for " + relative)
    if problems:
        return "; ".join(problems)
    return None


def omitted_files(section):
    """Return the files that the omitted files section names."""
    found = []
    for sentence in diff_doc.sentences(section):
        for token in BACKTICK.findall(sentence):
            if "/" in token and not token.endswith("/"):
                found.append(token)
    return found


def stated_omitted_count(section):
    """Return the number of omitted files that the section states, or None."""
    match = OMIT_COUNT.search(section)
    if match is None:
        return None
    return int(match.group(1))


def owner_evidence(section, relative):
    """Return True when a sentence names the file with a spec line and an owning task."""
    for sentence in diff_doc.sentences(section):
        if relative not in sentence:
            continue
        if SPEC_CITE.search(sentence) and MODULE_TASK.search(sentence):
            return True
    return False


def stated_allow_list(extra):
    """Return the allow-list prefixes that the extra paths section states."""
    for sentence in extra.split(". "):
        text = sentence.strip()
        if not text.startswith(ALLOW_LIST_SENTENCE):
            continue
        text = text[len(ALLOW_LIST_SENTENCE):].strip().rstrip(".")
        parts = text.replace(",", " and ").split(" and ")
        return sorted(part.strip() for part in parts if part.strip())
    return []


def check_allow_list(extra, prefixes):
    """Check that the extra paths section states the allow-list of the checker."""
    stated = stated_allow_list(extra)
    if stated != sorted(prefixes):
        return "the extra paths section states the allow-list %s, not %s" % (
            stated, sorted(prefixes))
    return None


def check_named_files(index, extra):
    """Check that every module file the extra paths section names exists."""
    names = sorted(set(PY_FILE.findall(extra)))
    missing = [
        name for name in names
        if not (index.tree_root / "tests" / "layout" / name).is_file()
    ]
    if missing:
        return "the extra paths section names missing files: " + ", ".join(missing)
    return None


def check_unnamed_files(index, extra):
    """Check that every checker module appears in the extra paths section."""
    names = set(PY_FILE.findall(extra))
    present = {
        path.name for path in (index.tree_root / "tests" / "layout").glob("*.py")
    }
    missing = sorted(present - names)
    if missing:
        return "the extra paths section does not name: " + ", ".join(missing)
    return None
