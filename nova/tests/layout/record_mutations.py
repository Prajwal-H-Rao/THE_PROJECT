"""Define the mutations that change the layout diff record."""

from mutations import insert_diff, read_diff, replace_diff, write_diff


def short_diff(work):
    """Remove one row from the layout diff."""
    text = read_diff(work)
    kept = [line for line in text.splitlines() if not line.startswith("| 10 | renamed")]
    write_diff(work, "\n".join(kept))
    return True


def wrong_split(work):
    """Change the kind of one row in the layout diff."""
    return replace_diff(
        work,
        "| 6 | renamed | web-app | apps/web |",
        "| 6 | catalogue-only | web-app | apps/web |")


def wrong_catalogue_name(work):
    """Rename a catalogue-only entry in the layout diff."""
    return replace_diff(
        work,
        "| 1 | catalogue-only | employer-registry-service | none |",
        "| 1 | catalogue-only | employer-registry | none |")


def swap_channels(work):
    """Swap the telegram and whatsapp rows in the layout diff."""
    return replace_diff(
        work,
        "| 8 | renamed | channel-adapter-telegram | services/telegram-adapter |",
        "| 8 | renamed | channel-adapter-whatsapp | services/telegram-adapter |")


def missing_citation(work):
    """Drop the layout citation from one row of the layout diff."""
    return replace_diff(
        work,
        "The layout path sits at spec:920.",
        "The layout path sits elsewhere.")


def wrong_omitted_count(work):
    """Change the omitted file count in the layout diff."""
    return replace_diff(
        work,
        "The tree omits 2 files that the spec names.",
        "The tree omits 3 files that the spec names.")


def bad_task_reference(work):
    """Point a task reference at a task that does not exist."""
    return replace_diff(
        work,
        "Module 13 task 15 carries the `worker` artifact.",
        "Module 13 task 99 carries the `worker` artifact.")


def wrong_deferred_item(work):
    """Drop one deferred spec item from the deferred cloud section."""
    return replace_diff(
        work,
        "spec:955, spec:835, spec:441 and spec:680",
        "spec:955, spec:835 and spec:441")


def wrong_scope_count(work):
    """Change a count in the scope section of the layout diff."""
    return replace_diff(
        work,
        "The catalogue holds 23 entries.",
        "The catalogue holds 24 entries.")


def wrong_leaf_count(work):
    """Change the leaf directory count in the extra paths section."""
    return replace_diff(
        work,
        "87 directories below the root, 60 leaf directories",
        "87 directories below the root, 61 leaf directories")


def missing_module_file(work):
    """Name a module file in the extra paths section that does not exist."""
    return replace_diff(work, "diff_doc.py", "diff_doc_absent.py")


def wrong_allow_list(work):
    """Change the allow-list that the extra paths section states."""
    return replace_diff(
        work,
        "The allow-list holds tests/layout, labs and db.",
        "The allow-list holds tests/layout and labs.")


def bad_spec_citation(work):
    """Point a spec citation at a line that the spec does not hold."""
    return replace_diff(work, "spec:721", "spec:9999")


def bad_plan_citation(work):
    """Point a plan citation at a file that the plan does not hold."""
    return replace_diff(
        work,
        "docs/plan/12-jobs-agent.md:40",
        "docs/plan/nonexistent.md:40")


def plan_citation_without_line(work):
    """Point a plan citation at a line that the file does not hold."""
    return replace_diff(
        work,
        "docs/plan/12-jobs-agent.md:40",
        "docs/plan/12-jobs-agent.md:9999")


def plan_citation_with_other_words(work):
    """Point a plan citation at a line that holds other words."""
    return replace_diff(
        work,
        "docs/plan/12-jobs-agent.md:40",
        "docs/plan/12-jobs-agent.md:1")


def wrong_task_binding(work):
    """Point a task reference at a task that owns another path."""
    return replace_diff(
        work,
        "Module 13 task 1 creates `services/employer-registry-service/import/`.",
        "Module 13 task 7 creates `services/employer-registry-service/import/`.")


def renamed_section(work):
    """Rename the precedence section of the layout diff."""
    return replace_diff(work, "## Precedence", "## Precedence rules")


def wrong_copy_rows(work):
    """Change the row count that the authoritative copy section states."""
    return replace_diff(work, "The copy holds the same 10 rows.", "The copy holds the same 12 rows.")


def wrong_service_count(work):
    """Change the service count that the authoritative copy section states."""
    return replace_diff(
        work,
        "each of the 23 catalogue services to appear exactly once.",
        "each of the 24 catalogue services to appear exactly once.")


def second_copy_rows(work):
    """Add a second row count to the authoritative copy section."""
    return insert_diff(
        work,
        "The copy holds the same 10 rows.",
        "The copy holds the same 12 rows.")


def second_service_count(work):
    """Add a second service count to the authoritative copy section."""
    return insert_diff(
        work,
        "each of the 23 catalogue services to appear exactly once.",
        "each of the 24 catalogue services to appear exactly once.")


def weaken_service_claim(work):
    """Let the record claim that a service may appear twice."""
    return replace_diff(
        work,
        "each of the 23 catalogue services to appear exactly once.",
        "each of the 23 catalogue services to appear exactly once or twice.")


def second_allow_list(work):
    """Add a second allow-list to the extra paths section."""
    return insert_diff(
        work,
        "The allow-list holds tests/layout, labs and db.",
        "The allow-list holds tests/layout and labs.")
