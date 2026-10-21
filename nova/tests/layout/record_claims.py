"""Check the claims of the layout diff record. Verify the sections and the copy."""

import re

# The sections that the record must hold.
REQUIRED_SECTIONS = (
    "Scope",
    "Precedence",
    "Differences",
    "Deferred cloud",
    "Omitted files",
    "Extra paths",
    "Authoritative copy",
)

COPY_ROWS = re.compile(r"the same (\d+) rows")
SERVICE_CLAIM = re.compile(r"each of the (\d+) catalogue services to appear exactly once")


def check_required_sections(sections):
    """Check that the record holds every section that it must hold."""
    missing = [name for name in REQUIRED_SECTIONS if name not in sections]
    if missing:
        return "the record holds no section: " + ", ".join(missing)
    return None


def check_copy_claims(section, rows, services, plan_requirement):
    """Check that the authoritative copy section states the row count and the service count."""
    problems = []
    problems += row_problems(section, rows)
    problems += service_problems(section, services)
    if plan_requirement is None:
        problems.append("the plan row of module 01 task 16 states no service requirement")
    elif plan_requirement != services:
        problems.append("the plan requires %d catalogue services, not %d" % (
            plan_requirement, services))
    if problems:
        return "; ".join(problems)
    return None


def row_problems(section, rows):
    """Return the problems of every row count that the section states."""
    counts = COPY_ROWS.findall(section)
    if not counts:
        return ["the authoritative copy section states no row count"]
    problems = []
    for count in counts:
        if int(count) != len(rows):
            problems.append("the authoritative copy section states %s rows, not %d" % (
                count, len(rows)))
    return problems


def service_problems(section, services):
    """Return the problems of every service count that the section states."""
    counts = SERVICE_CLAIM.findall(section)
    if not counts:
        return ["the authoritative copy section states no service count"]
    problems = []
    for count in counts:
        if int(count) != services:
            problems.append("the authoritative copy section states %s catalogue services, not %d" % (
                count, services))
    return problems
