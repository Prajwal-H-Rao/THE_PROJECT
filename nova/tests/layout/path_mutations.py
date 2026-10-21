"""Define the mutations that change the path lists of the layout diff record."""

from mutations import insert_diff, replace_diff


def wrong_ignored_list(work):
    """Change the ignored directories that the extra paths section states."""
    return replace_diff(
        work,
        "The ignored directories are __pycache__, node_modules, .next, .turbo, .venv, venv, .pytest_cache, .mypy_cache, .ruff_cache, build, coverage, dist, htmlcov, playwright-report, test-results and storybook-static.",
        "The ignored directories are __pycache__, node_modules and .next.")


def wrong_ignored_files(work):
    """Change the ignored files that the extra paths section states."""
    return replace_diff(
        work,
        "The ignored files are .coverage.",
        "The ignored files are .coverage and .pyc.")


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
        "The fifth is the repo-root .gitignore.",
        "The sixth is the phantom path nowhere/.")
