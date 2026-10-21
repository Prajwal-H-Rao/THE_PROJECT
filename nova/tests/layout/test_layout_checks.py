"""Run the layout checks against mutated trees. Prove that each check rejects a bad tree."""

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import check_layout
import mutations
import path_mutations
import plan_mutations
import record_mutations
import repo_checks
import spec_index

COPY_IGNORE = shutil.ignore_patterns("__pycache__", "*.pyc")
WORK_PARENT = "/tmp/opencode"

# Each mutation names the check that must reject it.
MUTATIONS = [
    ("A", "missing layout directory", mutations.missing_directory),
    ("B", "stray top-level directory", mutations.stray_directory),
    ("C", "nine row diff", record_mutations.short_diff),
    ("D", "wrong row kind", record_mutations.wrong_split),
    ("E", "wrong catalogue-only name", record_mutations.wrong_catalogue_name),
    ("F", "telegram and whatsapp swap", record_mutations.swap_channels),
    ("G", "missing spec citation", record_mutations.missing_citation),
    ("H", "empty leaf directory", mutations.empty_leaf),
    ("I", "copied spec file", mutations.copied_spec_file),
    ("I", "wrong omitted file count", record_mutations.wrong_omitted_count),
    ("J", "bad module task reference", record_mutations.bad_task_reference),
    ("K", "wrong deferred spec item", record_mutations.wrong_deferred_item),
    ("L", "mismatched task 16 copy", mutations.mismatched_copy),
    ("L", "mangled task 16 copy", mutations.mangled_copy),
    ("L", "task 16 copy with a false citation", mutations.false_citation_copy),
    ("M", "wrong scope count", record_mutations.wrong_scope_count),
    ("M", "wrong leaf count", record_mutations.wrong_leaf_count),
    ("N", "missing named module file", record_mutations.missing_module_file),
    ("O", "unnamed module file", mutations.unnamed_module_file),
    ("P", "file in the deferred directory", mutations.file_in_deferred_directory),
    ("P", "bare placeholder file", mutations.bare_placeholder),
    ("Q", "wrong allow-list statement", record_mutations.wrong_allow_list),
    ("R", "bad spec citation", record_mutations.bad_spec_citation),
    ("S", "bad plan citation", record_mutations.bad_plan_citation),
    ("S", "plan citation without a line", record_mutations.plan_citation_without_line),
    ("S", "plan citation with other words", record_mutations.plan_citation_with_other_words),
    ("T", "wrong task binding", record_mutations.wrong_task_binding),
    ("U", "missing ignore file", mutations.missing_gitignore),
    ("U", "missing artifact pattern", mutations.missing_artifact_pattern),
    ("V", "renamed section", record_mutations.renamed_section),
    ("W", "wrong ignored directory list", path_mutations.wrong_ignored_list),
    ("W", "wrong ignored file list", path_mutations.wrong_ignored_files),
    ("W", "wrong ignored directory suffix list", path_mutations.wrong_ignored_directory_suffixes),
    ("W", "wrong ignored file suffix list", path_mutations.wrong_ignored_file_suffixes),
    ("X", "missing extra path", path_mutations.missing_extra_path),
    ("X", "wrong extra path", path_mutations.wrong_extra_path),
    ("X", "missing path group", path_mutations.missing_path_group),
    ("X", "unnamed checker group", path_mutations.unnamed_checker_group),
    ("X", "wrong group count", path_mutations.wrong_group_count),
    ("X", "extra path in a group", path_mutations.extra_group_name),
    ("X", "sixth path group", path_mutations.sixth_path_group),
    ("Y", "wrong copy row count", record_mutations.wrong_copy_rows),
    ("Y", "wrong service count", record_mutations.wrong_service_count),
    ("Y", "second copy row count", record_mutations.second_copy_rows),
    ("Y", "second service count", record_mutations.second_service_count),
    ("Y", "plan service count", plan_mutations.plan_service_count),
    ("Y", "plan requirement", plan_mutations.plan_requirement),
    ("Z", "owned path that the checker skips", plan_mutations.owned_build_path),
]

# The scenarios name the changes that the checks must accept.
SCENARIOS = [
    ("build output under nova/", mutations.build_output),
    ("later module output under nova/", mutations.later_module_output),
]


def work_root():
    """Return the parent directory that holds the work directories."""
    if Path(WORK_PARENT).is_dir():
        return WORK_PARENT
    return tempfile.gettempdir()


def build_work(root):
    """Copy the tree, the plan and the repo root files into a work directory."""
    shutil.copytree(spec_index.TREE_ROOT, root / "nova", ignore=COPY_IGNORE)
    shutil.copy2(spec_index.REPO_ROOT / ".gitignore", root / ".gitignore")
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
    for label, name, mutate in MUTATIONS:
        labels = run_mutation(label, name, mutate)
        if labels is None:
            problems.append("the mutation " + name + " did not change the tree")
        elif label not in labels:
            problems.append("the mutation " + name + " did not fail check " + label)
        else:
            print("PASS " + label + " rejects " + name)
    for name, mutate in SCENARIOS:
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