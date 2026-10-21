"""Run the layout checks and report the result."""

import sys

import ci_checks
import claims_checks
import copy_checks
import diff_checks
import diff_doc
import plan_index
import record_claims
import record_paths
import repo_checks
import source_checks
import spec_index
import tree_checks


def build_checks(index, rows, sections, text, plan, texts, owned, repo_root, full_plan, plan_dir):
    """Return the named checks in the order that the runner runs them."""
    scope = sections.get("Scope", "")
    extra = sections.get("Extra paths", "")
    copy = sections.get("Authoritative copy", "")
    expected_rows, expected_split = plan_index.diff_row_expectation(plan_dir)
    plan_requirement = plan_index.service_requirement(plan_dir)
    copy_label = "L authoritative copy (" + copy_checks.copy_state(index.tree_root) + ")"
    return [
        ("A layout directories exist", lambda: tree_checks.check_layout_directories(index)),
        ("B tree directories", lambda: tree_checks.check_no_unknown_directories(index)),
        ("C diff row count", lambda: diff_checks.check_diff_row_count(rows, expected_rows)),
        ("D diff split", lambda: diff_checks.check_diff_split(rows, expected_split)),
        ("E partition closes", lambda: diff_checks.check_partition(index, rows)),
        ("F renamed pairing", lambda: diff_checks.check_pairing(index, rows)),
        ("G note evidence", lambda: diff_checks.check_note_evidence(index, rows)),
        ("H leaf files and counts", lambda: tree_checks.check_leaf_files(index)),
        ("I omitted files", lambda: claims_checks.check_omitted_files(index, sections.get("Omitted files", ""))),
        ("J module references", lambda: diff_checks.check_module_references(text, plan)),
        ("K deferred cloud note", lambda: diff_checks.check_deferred_note(sections.get("Deferred cloud", ""), owned)),
        (copy_label, lambda: copy_checks.check_copy(index.tree_root, rows)),
        ("M scope claims", lambda: claims_checks.check_scope_claims(index, rows, scope, extra)),
        ("N named files", lambda: claims_checks.check_named_files(index, extra)),
        ("O unnamed files", lambda: claims_checks.check_unnamed_files(index, extra)),
        ("P tree files", lambda: tree_checks.check_tree_files(index, owned)),
        ("Q allow-list", lambda: claims_checks.check_allow_list(extra, tree_checks.EXTRA_DIRECTORY_PREFIXES)),
        ("R spec citations", lambda: source_checks.check_spec_citations(index, text)),
        ("S plan citations", lambda: source_checks.check_plan_citations(repo_root, text, rows)),
        ("T task bindings", lambda: source_checks.check_task_bindings(text, rows, texts, full_plan)),
        ("U gitignore", lambda: repo_checks.check_gitignore(repo_root)),
        ("V record sections", lambda: record_claims.check_required_sections(sections)),
        ("W ignored paths", lambda: record_paths.check_ignored_paths(extra)),
        ("X extra paths", lambda: record_paths.check_extra_paths(index, extra)),
        ("Y copy claims", lambda: record_claims.check_copy_claims(copy, rows, len(index.catalogue), plan_requirement)),
        ("Z owned paths", lambda: tree_checks.check_owned_paths(owned)),
        ("AA ci workflow", lambda: ci_checks.check_ci_workflow(repo_root)),
    ]


def run_checks(tree_root=None, repo_root=None, plan_dir=None):
    """Run every check and return the label and the problem of each check."""
    index = spec_index.SpecIndex()
    if tree_root is not None:
        index.tree_root = tree_root
    if repo_root is None:
        repo_root = spec_index.REPO_ROOT
    if plan_dir is None:
        plan_dir = spec_index.PLAN_DIR
    diff_path = index.tree_root / spec_index.RECORD_PATH
    if not diff_path.exists():
        return [("A layout directories exist", "the layout diff is missing: " + str(diff_path))]
    text = diff_path.read_text(encoding="utf-8")
    lines = text.splitlines()
    rows = diff_doc.rows(lines)
    sections = diff_doc.sections(lines)
    plan = plan_index.task_index(plan_dir)
    texts = plan_index.task_texts(plan_dir)
    owned = plan_index.owned_paths(plan_dir)
    full_plan = plan_index.plan_text(plan_dir)

    results = []
    checks = build_checks(index, rows, sections, text, plan, texts, owned, repo_root, full_plan, plan_dir)
    for label, run in checks:
        results.append((label, run()))
    return results


def main(tree_root=None, repo_root=None):
    """Run every check, print the result and return the exit code."""
    index = spec_index.SpecIndex()
    if tree_root is not None:
        index.tree_root = tree_root
    failures = 0
    for label, problem in run_checks(tree_root, repo_root):
        if problem is None:
            print("PASS " + label)
        else:
            failures += 1
            print("FAIL " + label + ": " + problem)
    print("tree: %d directories, %d leaf directories, %d placeholders" % (
        len(tree_checks.counted_paths(index.tree_root)),
        len(tree_checks.leaf_directories(index.tree_root)),
        len(tree_checks.placeholder_files(index.tree_root)),
    ))
    print("catalogue: %d entries, %d deployable units, %d exact matches" % (
        len(index.catalogue),
        len(index.deployables),
        len(index.catalogue) - len(index.unmatched_names),
    ))
    if failures:
        print("%d checks failed" % failures)
        return 1
    print("all checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
