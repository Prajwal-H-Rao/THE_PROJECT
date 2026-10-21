"""Check the repo root files. Verify the ignore file."""

import subprocess

import ignored_paths

# The name of the repo root ignore file.
IGNORE_FILE_NAME = ".gitignore"


def active_patterns(text):
    """Return the ignore patterns that the file holds."""
    found = []
    for line in text.splitlines():
        item = line.strip()
        if not item or item.startswith("#"):
            continue
        found.append(item)
    return found


def check_gitignore(repo_root):
    """Check that the repo root ignore file covers the build output."""
    path = repo_root / IGNORE_FILE_NAME
    if not path.is_file():
        return "the repo root holds no " + IGNORE_FILE_NAME
    patterns = active_patterns(path.read_text(encoding="utf-8"))
    missing = [
        pattern for pattern in ignored_paths.gitignore_patterns()
        if pattern not in patterns
    ]
    if missing:
        return "the " + IGNORE_FILE_NAME + " holds no " + ", ".join(missing)
    problems = git_leaks(repo_root)
    if problems:
        return "; ".join(problems)
    return None


def git_leaks(repo_root):
    """Return the build output paths that git does not ignore."""
    if not (repo_root / ".git").exists():
        # The git check needs a checkout. An exported tree cannot prove the ignore rules.
        return ["the repo holds no .git directory"]
    found = []
    for sample in ignored_paths.sample_paths():
        try:
            result = subprocess.run(
                ["git", "check-ignore", "-q", "--no-index", sample],
                cwd=str(repo_root),
                capture_output=True,
                timeout=30,
            )
        except (OSError, subprocess.SubprocessError):
            # Git failed. The check must report the failure, not pass it.
            return ["git could not read the ignore rules"]
        if result.returncode == 1:
            found.append("git does not ignore " + sample)
        elif result.returncode != 0:
            found.append("git failed on " + sample)
    return found
