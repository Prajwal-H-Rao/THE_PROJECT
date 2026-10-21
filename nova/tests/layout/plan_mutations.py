"""Define the mutations that change the plan copy in a work directory."""

# The plan row that states the service count of the service map.
SERVICE_ROW = "docs/plan/01-architecture.md"
SERVICE_TEXT = "Each of the 23 catalogue services appears exactly once"
SERVICE_CHANGE = "Each of the 24 catalogue services appears exactly once"
REQUIREMENT_TEXT = "appears exactly once"
REQUIREMENT_CHANGE = "appears at most once"

# The plan row that names the checker directory.
CHECKER_TEXT = "`nova/tests/layout/` checks"
CHECKER_CHANGE = "`nova/services/audit-service/build/` checks"

# The plan row that names the employer registry importer.
REGISTRY_ROW = "docs/plan/13-employer-registry.md"
REGISTRY_TEXT = "`services/employer-registry-service/import/`"
REGISTRY_CHANGE = "`services/employer-registry-service/importer/`"

# The plan rows that the citation mutations touch.
ARCHITECTURE_ROW = "docs/plan/01-architecture.md"
RUNTIME_ROW = "docs/plan/03-agent-runtime.md"


def plan_service_count(work):
    """Change the service count that the plan states."""
    return replace_plan(work, SERVICE_ROW, SERVICE_TEXT, SERVICE_CHANGE)


def plan_requirement(work):
    """Weaken the service requirement that the plan states."""
    return replace_plan(work, SERVICE_ROW, REQUIREMENT_TEXT, REQUIREMENT_CHANGE)


def owned_build_path(work):
    """Name a path that the checker skips in a plan row."""
    return replace_plan(work, SERVICE_ROW, CHECKER_TEXT, CHECKER_CHANGE)


def weaken_service_requirement(work):
    """Let the plan accept a service more than once."""
    return replace_plan(work, SERVICE_ROW, SERVICE_TEXT, SERVICE_TEXT + " or twice")


def rename_owned_artifact(work):
    """Rename a plan artifact to a longer path with the same prefix."""
    return replace_plan(work, REGISTRY_ROW, REGISTRY_TEXT, REGISTRY_CHANGE)


def narrow_range(work):
    """Drop the last line of a range citation in the plan."""
    return replace_plan(work, ARCHITECTURE_ROW, "spec:727-749", "spec:727-748")


def rename_quoted_word(work):
    """Rename a word inside a quoted spec string in the plan."""
    return replace_plan(
        work, RUNTIME_ROW,
        "The model is never permitted to choose arbitrary URLs",
        "The model is never permitted to choose random URLs")


def replace_plan(work, relative, old, new):
    """Replace a string in one plan file of a work directory."""
    path = work / relative
    text = path.read_text(encoding="utf-8")
    if old not in text:
        return False
    path.write_text(text.replace(old, new), encoding="utf-8")
    return True
