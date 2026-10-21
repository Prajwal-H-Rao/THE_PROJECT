"""Name the build output that the tree checks skip."""

# The names that hold build output at any depth. No source directory uses them.
ALWAYS_IGNORED = (
    "__pycache__",
    "node_modules",
    ".next",
    ".turbo",
    ".venv",
    "venv",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
)

# The names that hold build output directly under a package root.
OUTPUT_NAMES = (
    "build",
    "coverage",
    "dist",
    "htmlcov",
    "playwright-report",
    "storybook-static",
    "test-results",
)

# The directory name suffixes that hold build output.
IGNORED_DIRECTORY_SUFFIXES = (".egg-info",)

# The file names that hold build output.
IGNORED_FILES = (".coverage",)

# The temporary files that a tool run leaves behind.
IGNORED_TEMPORARY_FILES = ("type_error_proof.py",)

# The file name suffixes that hold build output.
IGNORED_FILE_SUFFIXES = (".pyc", ".pyo", ".tsbuildinfo")

# The package roots that hold build output. A source directory under one of them
# with an output name is build output.
PACKAGE_ROOTS = ("services", "workers", "packages")
WEB_ROOT = ("apps", "web")


def is_output_root(parts):
    """Return True when the path parts name a package root."""
    if tuple(parts) == WEB_ROOT:
        return True
    return len(parts) == 2 and parts[0] in PACKAGE_ROOTS


def is_ignored(relative):
    """Return True when a tree relative path holds build output."""
    parts = relative.split("/")
    for index, name in enumerate(parts):
        if name in ALWAYS_IGNORED:
            return True
        if name in OUTPUT_NAMES and is_output_root(parts[:index]):
            return True
        for suffix in IGNORED_DIRECTORY_SUFFIXES:
            if name.endswith(suffix):
                return True
    name = parts[-1]
    for ignored in IGNORED_FILES:
        if name == ignored:
            return True
    for ignored in IGNORED_TEMPORARY_FILES:
        if name == ignored:
            return True
    for suffix in IGNORED_FILE_SUFFIXES:
        if name.endswith(suffix):
            return True
    return False


def scoped_pattern(name):
    """Return the ignore patterns that scope one output name to the package roots."""
    return [
        "nova/apps/web/" + name + "/",
        "nova/services/*/" + name + "/",
        "nova/workers/*/" + name + "/",
        "nova/packages/*/" + name + "/",
    ]


def gitignore_patterns():
    """Return the ignore patterns that cover the build output."""
    patterns = ["**/" + name + "/" for name in ALWAYS_IGNORED]
    patterns += ["**/*" + suffix + "/" for suffix in IGNORED_DIRECTORY_SUFFIXES]
    for name in OUTPUT_NAMES:
        patterns += scoped_pattern(name)
    patterns += list(IGNORED_FILES)
    patterns += list(IGNORED_TEMPORARY_FILES)
    patterns += ["*" + suffix for suffix in IGNORED_FILE_SUFFIXES]
    return patterns


def sample_paths():
    """Return the paths that prove the ignore file covers the build output."""
    paths = ["nova/" + name + "/" for name in ALWAYS_IGNORED]
    paths += ["nova/sample" + suffix + "/" for suffix in IGNORED_DIRECTORY_SUFFIXES]
    for name in OUTPUT_NAMES:
        paths.append("nova/apps/web/" + name + "/")
        paths.append("nova/services/audit-service/" + name + "/")
        paths.append("nova/workers/scheduler-worker/" + name + "/")
        paths.append("nova/packages/design-system/" + name + "/")
    paths += ["nova/" + name for name in IGNORED_FILES]
    paths += ["nova/" + name for name in IGNORED_TEMPORARY_FILES]
    paths += ["nova/sample" + suffix for suffix in IGNORED_FILE_SUFFIXES]
    return paths
