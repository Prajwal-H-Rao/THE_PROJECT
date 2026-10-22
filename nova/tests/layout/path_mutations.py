"""Define the mutations that change the path lists of the layout diff record."""

from mutations import insert_diff, replace_diff

IGNORED_DIRECTORIES = (
    "The always ignored names are __pycache__, node_modules, .next, .turbo, .venv, venv, "
    ".pytest_cache, .mypy_cache and .ruff_cache."
)


def wrong_ignored_list(work):
    """Change the always ignored names that the extra paths section states."""
    return replace_diff(
        work,
        IGNORED_DIRECTORIES,
        "The always ignored names are __pycache__, node_modules and .next.")


OUTPUT_NAMES = (
    "The ignored output names are build, coverage, dist, htmlcov, playwright-report, "
    "storybook-static and test-results."
)


def wrong_output_names(work):
    """Change the ignored output names that the extra paths section states."""
    return replace_diff(
        work,
        OUTPUT_NAMES,
        "The ignored output names are build and dist.")


def wrong_ignored_files(work):
    """Change the ignored files that the extra paths section states."""
    return replace_diff(
        work,
        "The ignored files are .coverage and next-env.d.ts.",
        "The ignored files are .coverage and next-env.d.ts and .pyc.")


def wrong_ignored_directory_suffixes(work):
    """Change the ignored directory suffixes that the extra paths section states."""
    return replace_diff(
        work,
        "The ignored directory suffixes are .egg-info.",
        "The ignored directory suffixes are .dist-info.")


def wrong_ignored_file_suffixes(work):
    """Change the ignored file suffixes that the extra paths section states."""
    return replace_diff(
        work,
        "The ignored file suffixes are .pyc, .pyo and .tsbuildinfo.",
        "The ignored file suffixes are .pyc and .pyo.")


def missing_extra_path(work):
    """Drop one extra path from the extra paths section."""
    return replace_diff(
        work,
        "The second is the two implied parents infra/k8s/overlays/ and infra/terraform/.",
        "The second is the implied parent infra/k8s/overlays/.")


def wrong_extra_path(work):
    """State the wrong implied parents in the extra paths section."""
    return replace_diff(
        work,
        "The second is the two implied parents infra/k8s/overlays/ and infra/terraform/.",
        "The second is the two implied parents infra/k8s/overlays/eks/ and infra/terraform/aws/.")


def missing_path_group(work):
    """Drop one path group from the extra paths section."""
    return replace_diff(
        work,
        "The fourth is the .gitkeep placeholder files that mark the empty directories. ",
        "")


def unnamed_checker_group(work):
    """Name the checker group without its path."""
    return replace_diff(
        work,
        "The third is tests/layout/ with",
        "The third is the checker modules with")


def wrong_group_count(work):
    """State the wrong number of names in a path group."""
    return replace_diff(
        work,
        "The second is the two implied parents",
        "The second is the three implied parents")


def extra_group_name(work):
    """Name a path that the tree does not hold in a path group."""
    return replace_diff(
        work,
        "infra/k8s/overlays/ and infra/terraform/.",
        "infra/k8s/overlays/, infra/terraform/ and infra/fake-cloud/.")


def sixth_path_group(work):
    """Add a path group that the record does not count."""
    return insert_diff(
        work,
        "The fifth is the repo-root .gitignore, the pyproject.toml and the .github/workflows/ci.yml.",
        "The sixth is the phantom path nowhere/.")


def swap_group_ordinals(work):
    """Swap the ordinals of the first and the fifth path groups."""
    if not replace_diff(
        work,
        "The first is docs/layout-diff.md.",
        "The fifth is docs/layout-diff.md."):
        return False
    return replace_diff(
        work,
        "The fifth is the repo-root",
        "The first is the repo-root")
