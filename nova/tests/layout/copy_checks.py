"""Check the copy of the layout diff that module 01 task 16 writes."""

import diff_doc

# The folder that holds the architecture documents.
ARCHITECTURE = "docs/architecture"

# The file that holds the copy of the record.
COPY_FILE = "layout-diff.md"


def copy_path(tree_root):
    """Return the path of the copy of the record."""
    return tree_root / ARCHITECTURE / COPY_FILE


def architecture_files(tree_root):
    """Return the markdown files under the architecture folder."""
    directory = tree_root / ARCHITECTURE
    if not directory.is_dir():
        return []
    return sorted(directory.glob("*.md"))


def row_key(row):
    """Return the three columns that a copy must match."""
    return (
        row.get("Kind", ""),
        row.get("Catalogue entry", ""),
        row.get("Layout path", ""),
    )


def row_cites(row):
    """Return the spec lines that a row note cites."""
    return set(diff_doc.SPEC_CITE.findall(row.get("Note", "")))


def check_copy(tree_root, rows):
    """Check that the copy of the record holds the same rows as the record."""
    problems = []
    path = copy_path(tree_root)
    if path.is_file():
        tables = diff_doc.tables(path.read_text(encoding="utf-8").splitlines())
        if not tables:
            problems.append("the copy at " + COPY_FILE + " holds no layout diff table")
        for table in tables:
            problems += table_problems(table, rows, COPY_FILE)
    for other in architecture_files(tree_root):
        if other.name == COPY_FILE:
            continue
        for table in diff_doc.tables(other.read_text(encoding="utf-8").splitlines()):
            problems += table_problems(table, rows, other.name)
    if problems:
        return "; ".join(problems)
    return None


def table_problems(table, rows, name):
    """Return the problems of one copy table against the rows of the record."""
    if len(table) != len(rows):
        return ["the copy at " + name + " holds %d rows, not %d" % (len(table), len(rows))]
    problems = []
    for number, (row, wanted) in enumerate(zip(table, rows), 1):
        if row_key(row) != row_key(wanted):
            problems.append("the copy at " + name + " holds the wrong row %d" % number)
            continue
        extra = sorted(row_cites(row) - row_cites(wanted))
        if extra:
            problems.append("the copy at " + name + " cites spec:%s in row %d" % (
                ", spec:".join(extra), number))
    return problems


def copy_state(tree_root):
    """Return the state of the copy of the record."""
    if copy_path(tree_root).is_file():
        return "copy checked"
    return "no copy yet"
