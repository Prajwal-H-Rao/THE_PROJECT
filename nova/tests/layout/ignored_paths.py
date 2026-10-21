"""Name the build output that the tree checks skip."""

# The directory names that hold build output. The .gitignore lists each of them.
IGNORED_DIRECTORIES = (
    "__pycache__",
    "node_modules",
    ".next",
    ".turbo",
    ".venv",
    "venv",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "build",
    "coverage",
    "dist",
    "htmlcov",
    "playwright-report",
    "test-results",
    "storybook-static",
)

# The directory name suffixes that hold build output.
IGNORED_DIRECTORY_SUFFIXES = (".egg-info",)

# The file names that hold build output.
IGNORED_FILES = (".coverage",)

# The file name suffixes that hold build output.
IGNORED_FILE_SUFFIXES = (".pyc", ".pyo", ".tsbuildinfo")


def is_ignored(relative):
    """Return True when a tree relative path holds build output."""
    parts = relative.split("/")
    for directory in IGNORED_DIRECTORIES:
        if directory in parts:
            return True
    for suffix in IGNORED_DIRECTORY_SUFFIXES:
        if any(part.endswith(suffix) for part in parts):
            return True
    name = parts[-1]
    for ignored in IGNORED_FILES:
        if name == ignored:
            return True
    for suffix in IGNORED_FILE_SUFFIXES:
        if name.endswith(suffix):
            return True
    return False


def gitignore_patterns():
    """Return the ignore patterns that cover the build output."""
    patterns = [name + "/" for name in IGNORED_DIRECTORIES]
    patterns += ["*" + suffix + "/" for suffix in IGNORED_DIRECTORY_SUFFIXES]
    patterns += list(IGNORED_FILES)
    patterns += ["*" + suffix for suffix in IGNORED_FILE_SUFFIXES]
    return patterns


def sample_paths():
    """Return the paths that prove the ignore file covers the build output."""
    paths = ["nova/" + name + "/" for name in IGNORED_DIRECTORIES]
    paths += ["nova/sample" + suffix + "/" for suffix in IGNORED_DIRECTORY_SUFFIXES]
    paths += ["nova/" + name for name in IGNORED_FILES]
    paths += ["nova/sample" + suffix for suffix in IGNORED_FILE_SUFFIXES]
    return paths
