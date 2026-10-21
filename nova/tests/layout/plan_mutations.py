"""Define the mutations that change the plan copy in a work directory."""

# The plan row that states the service count of the service map.
SERVICE_ROW = "docs/plan/01-architecture.md"
SERVICE_TEXT = "Each of the 23 catalogue services appears exactly once"
SERVICE_CHANGE = "Each of the 24 catalogue services appears exactly once"
REQUIREMENT_TEXT = "appears exactly once"
REQUIREMENT_CHANGE = "appears at most once"

# The plan row that names the checker directory.
CHECKER_TEXT = "`nova/tests/layout/` checks"
CHECKER_CHANGE = "`nova/build/` checks"


def plan_service_count(work):
    """Change the service count that the plan states."""
    return replace_plan(work, SERVICE_TEXT, SERVICE_CHANGE)


def plan_requirement(work):
    """Weaken the service requirement that the plan states."""
    return replace_plan(work, REQUIREMENT_TEXT, REQUIREMENT_CHANGE)


def owned_build_path(work):
    """Name a path that the checker skips in a plan row."""
    return replace_plan(work, CHECKER_TEXT, CHECKER_CHANGE)


def replace_plan(work, old, new):
    """Replace a string in the plan copy of a work directory."""
    path = work / SERVICE_ROW
    text = path.read_text(encoding="utf-8")
    if old not in text:
        return False
    path.write_text(text.replace(old, new), encoding="utf-8")
    return True
