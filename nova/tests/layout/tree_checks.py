"""Check the nova/ tree against the NOVA spec layout."""

import ignored_paths

# The module that owns a path adds the path prefix to this list.
EXTRA_DIRECTORY_PREFIXES = ("tests/layout", "labs", "db")

# The tree counts that the repo records. A module task updates them.
EXPECTED_DIRECTORIES = 129
EXPECTED_LEAVES = 88
EXPECTED_PLACEHOLDERS = 37

# The header that every placeholder file holds.
PLACEHOLDER_TEXT = "# Placeholder. Git cannot track an empty directory. The owning module task adds the content."

# The name of every placeholder file.
PLACEHOLDER_NAME = ".gitkeep"

# The directory that the plan defers. It holds the placeholder and nothing else.
DEFERRED_DIRECTORY = "infra/terraform/aws"

# The directory that holds the checker modules.
CHECKER_DIRECTORY = "tests/layout"

# The directory that holds the service templates.
TEMPLATE_DIRECTORY = "services/_template"


def walk_directories(root):
    """Return every directory under a root path."""
    return sorted(path for path in root.rglob("*") if path.is_dir())


def relative_paths(root):
    """Return every directory under a root path, relative to that root."""
    return [path.relative_to(root).as_posix() for path in walk_directories(root)]


def counted_paths(root):
    """Return every source directory under a root path, relative to that root."""
    return [
        relative for relative in relative_paths(root)
        if not ignored_paths.is_ignored(relative)
    ]


def is_allowed_extra(relative):
    """Return True when a directory sits under an allow-listed path prefix."""
    for prefix in EXTRA_DIRECTORY_PREFIXES:
        if relative == prefix or relative.startswith(prefix + "/"):
            return True
    return False


def lies_under_layout(relative, allowed):
    """Return True when a directory sits under a directory in the spec layout."""
    parts = relative.split("/")
    for depth in range(1, len(parts)):
        if "/".join(parts[:depth]) in allowed:
            return True
    return False


def leaf_directories(root):
    """Return the leaf directories under a root path."""
    leaves = []
    for path in walk_directories(root):
        relative = path.relative_to(root).as_posix()
        if ignored_paths.is_ignored(relative):
            continue
        children = [
            child for child in path.iterdir()
            if not ignored_paths.is_ignored(child.relative_to(root).as_posix())
        ]
        if not any(child.is_dir() for child in children):
            leaves.append(relative)
    return leaves


def source_files(root):
    """Return every source file under a root path, relative to that root."""
    found = []
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        relative = path.relative_to(root).as_posix()
        if ignored_paths.is_ignored(relative):
            continue
        found.append(relative)
    return found


def placeholder_files(root):
    """Return every placeholder file under a root path, relative to that root."""
    return [relative for relative in source_files(root) if relative.endswith(PLACEHOLDER_NAME)]


def check_layout_directories(index):
    """Check that every directory the layout names exists in the tree."""
    missing = sorted(
        path for path in index.layout_directories
        if path and not (index.tree_root / path).is_dir()
    )
    if missing:
        return "missing layout directories: " + ", ".join(missing)
    return None


def check_no_unknown_directories(index):
    """Check that every directory sits in the layout, under one, or on the allow-list."""
    allowed = set(index.layout_directories) | set(index.implied_parents)
    unknown = []
    for relative in counted_paths(index.tree_root):
        if relative in allowed or is_allowed_extra(relative):
            continue
        if lies_under_layout(relative, allowed):
            continue
        unknown.append(relative)
    if unknown:
        return "directories outside the layout: " + ", ".join(sorted(unknown))
    count = len(counted_paths(index.tree_root))
    if count != EXPECTED_DIRECTORIES:
        return "the tree holds %d directories, not %d" % (count, EXPECTED_DIRECTORIES)
    return None


def check_leaf_files(index):
    """Check the leaf directories and the placeholder count."""
    leaves = leaf_directories(index.tree_root)
    empty = [
        relative for relative in leaves
        if not any(child.is_file() for child in (index.tree_root / relative).iterdir())
    ]
    if empty:
        return "leaf directories hold no file: " + ", ".join(sorted(empty))
    if len(leaves) != EXPECTED_LEAVES:
        return "the tree holds %d leaf directories, not %d" % (len(leaves), EXPECTED_LEAVES)
    placeholders = len(placeholder_files(index.tree_root))
    if placeholders != EXPECTED_PLACEHOLDERS:
        return "the tree holds %d placeholders, not %d" % (placeholders, EXPECTED_PLACEHOLDERS)
    return None


def check_tree_files(index, owned):
    """Check the files that the tree holds against the files that a plan task names."""
    problems = []
    for relative in source_files(index.tree_root):
        path = index.tree_root / relative
        if path.name == PLACEHOLDER_NAME:
            if path.read_text(encoding="utf-8").strip() != PLACEHOLDER_TEXT:
                problems.append("the placeholder " + relative + " holds no header comment")
            continue
        if relative.startswith(DEFERRED_DIRECTORY + "/"):
            problems.append("the deferred directory holds " + relative)
            continue
        if relative.startswith(CHECKER_DIRECTORY + "/"):
            if path.suffix != ".py":
                problems.append("the checker directory holds " + relative)
            continue
        if relative == "docs/layout-diff.md":
            continue
        if not is_owned(relative, owned):
            problems.append("the tree holds the undeclared file " + relative)
    if problems:
        return "; ".join(sorted(problems))
    return None


def is_owned(relative, owned):
    """Return True when a plan task names the path of a file."""
    for path in owned:
        if relative == path or relative.startswith(path + "/"):
            return True
    return False


def check_owned_paths(owned):
    """Check that no plan path holds a name that the checker skips."""
    skipped = sorted(
        path for path in owned
        if ignored_paths.is_ignored(path)
    )
    if skipped:
        return "the plan names a path that the checker skips: " + ", ".join(skipped)
    return None
