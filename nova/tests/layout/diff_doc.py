"""Read the layout diff document. Provides the table rows, the sections and the citations."""

import re

COLUMNS = ("Kind", "Catalogue entry", "Layout path", "Note")
ABSENT = "none"
BACKTICK = re.compile(r"`([^`]+)`")
SPEC_CITE = re.compile(r"spec:(\d+)")
PLAN_CITE = re.compile(r"([\w./-]+\.md):(\d+)")
MODULE_TASK = re.compile(r"Module (\d+) tasks? (\d+)(?: to (\d+))?", re.IGNORECASE)
MODULE_ANY = re.compile(r"Module (\d+)", re.IGNORECASE)
WORD = re.compile(r"[A-Za-z0-9]+")


def clean_cell(cell):
    """Return a table cell without backticks or surrounding space."""
    return cell.strip().strip("`").strip()


def table_cells(line):
    """Return the cells of a markdown table row, or an empty list."""
    if not line.startswith("|"):
        return []
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def tables(lines):
    """Return the layout difference tables of a document, one list per table."""
    found = []
    header = None
    table = []
    for line in lines:
        cells = table_cells(line)
        if not cells:
            if table:
                found.append(table)
            header = None
            table = []
            continue
        if set("".join(cells)) <= {"-", " "}:
            continue
        names = [clean_cell(cell) for cell in cells]
        if header is None:
            if all(column in names for column in COLUMNS[:3]):
                header = {name: index for index, name in enumerate(names)}
                table = []
            continue
        row = {}
        for name, index in header.items():
            row[name] = clean_cell(cells[index]) if index < len(cells) else ""
        table.append(row)
    if table:
        found.append(table)
    return found


def rows(lines):
    """Return the data rows of the layout difference table, keyed by column name."""
    return [row for table in tables(lines) for row in table]


def sections(lines):
    """Return the text of each named section, keyed by the heading text."""
    found = {}
    heading = None
    body = []
    for line in lines:
        if line.startswith("## "):
            if heading is not None:
                found[heading] = "\n".join(body)
            heading = line[3:].strip()
            body = []
        elif heading is not None:
            body.append(line)
    if heading is not None:
        found[heading] = "\n".join(body)
    return found


def sentences(text):
    """Return the sentences of a text."""
    parts = []
    for line in text.splitlines():
        if line.startswith("|"):
            continue
        for part in line.split(". "):
            part = part.strip()
            if part:
                parts.append(part)
    return parts


def words(text):
    """Return the lowercase words of five characters or more."""
    return {word.lower() for word in WORD.findall(text) if len(word) >= 5}
