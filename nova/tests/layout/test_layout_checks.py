"""Run the layout checks against mutated trees. Prove that each check rejects a bad tree."""

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import cases
import check_layout
import repo_checks
import spec_index

COPY_IGNORE = shutil.ignore_patterns("__pycache__", "*.pyc")
WORK_PARENT = "/tmp/opencode"

def work_root():
    """Return the parent directory that holds the work directories."""
    if Path(WORK_PARENT).is_dir():
        return WORK_PARENT
    return tempfile.gettempdir()


def build_work(root):
    """Copy the tree, the plan and the repo root files into a work directory."""
    shutil.copytree(spec_index.TREE_ROOT, root / "nova", ignore=COPY_IGNORE)
    shutil.copy2(spec_index.REPO_ROOT / ".gitignore", root / ".gitignore")
    shutil.copy2(spec_index.REPO_ROOT / "pyproject.toml", root / "pyproject.toml")
    shutil.copytree(spec_index.REPO_ROOT / ".github", root / ".github")
    # The plan is a copy. A mutation must not change the real plan.
    shutil.copytree(spec_index.REPO_ROOT / "docs", root / "docs")
    # The work directory is a git repo. The git check must run in every mutation.
    subprocess.run(["git", "init", "-q"], cwd=str(root), check=True)
    return root / "nova"


def test_git_leak_detection():
    """Assert that the git check finds a build output path that git does not ignore."""
    root = Path(tempfile.mkdtemp(dir=work_root()))
    try:
        subprocess.run(["git", "init", "-q"], cwd=str(root), check=True)
        (root / ".gitignore").write_text("build/\n", encoding="utf-8")
        problems = repo_checks.git_leaks(root)
        if not any("nova/node_modules/" in problem for problem in problems):
            return "the git check did not find the leak of nova/node_modules/"
    finally:
        shutil.rmtree(root, ignore_errors=True)
    return None


def failing_labels(work):
    """Return the check letters of the checks that fail in a work directory."""
    results = check_layout.run_checks(work / "nova", work, work / "docs" / "plan")
    return [label.split()[0] for label, problem in results if problem is not None]


def run_clean():
    """Run the checks against the real tree and return the failures."""
    results = check_layout.run_checks(spec_index.TREE_ROOT, spec_index.REPO_ROOT)
    return [(label, problem) for label, problem in results if problem is not None]


def run_change(mutate):
    """Apply a change in a work directory and return the labels of the failing checks."""
    root = Path(tempfile.mkdtemp(dir=work_root()))
    try:
        build_work(root)
        changed = mutate(root)
        return changed, failing_labels(root)
    finally:
        shutil.rmtree(root, ignore_errors=True)


def run_mutation(label, name, mutate):
    """Run one mutation and return the labels of the checks that fail."""
    changed, labels = run_change(mutate)
    if not changed:
        return None
    return labels


def main():
    """Run the clean checks and every mutation and report the result."""
    failures = run_clean()
    if failures:
        for label, problem in failures:
            print("FAIL the clean tree fails " + label + ": " + str(problem))
        return 1
    print("PASS the clean tree passes every check")
    problems = []
    leak = test_git_leak_detection()
    if leak:
        problems.append(leak)
    else:
        print("PASS the git check finds a leak that the text check cannot see")
    for label, name, mutate in cases.MUTATIONS:
        labels = run_mutation(label, name, mutate)
        if labels is None:
            problems.append("the mutation " + name + " did not change the tree")
        elif label not in labels:
            problems.append("the mutation " + name + " did not fail check " + label)
        else:
            print("PASS " + label + " rejects " + name)
    for name, mutate in cases.SCENARIOS:
        changed, labels = run_change(mutate)
        if not changed:
            problems.append("the scenario " + name + " did not change the tree")
        elif labels:
            problems.append("the scenario " + name + " failed checks " + ", ".join(labels))
        else:
            print("PASS the checks accept " + name)
    for problem in problems:
        print("FAIL " + problem)
    if problems:
        return 1
    print("every mutation was rejected by its check")
    return 0


def test_mutations_are_rejected():
    """Assert that every check rejects the mutation that targets it."""
    assert main() == 0


if __name__ == "__main__":
    sys.exit(main())
