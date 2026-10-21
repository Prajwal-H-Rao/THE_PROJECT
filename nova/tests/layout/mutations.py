"""Build a mutated copy of the nova/ tree. Define the mutations that change the tree."""

import shutil
from pathlib import Path

import spec_index

DIFF_RELATIVE = Path(spec_index.RECORD_PATH)


def tree(work):
    """Return the tree root inside a work directory."""
    return work / "nova"


def read_diff(work):
    """Return the text of the layout diff in a work tree."""
    return (tree(work) / DIFF_RELATIVE).read_text(encoding="utf-8")


def write_diff(work, text):
    """Write the layout diff in a work tree."""
    (tree(work) / DIFF_RELATIVE).write_text(text, encoding="utf-8")


def replace_diff(work, old, new):
    """Replace a string in the layout diff of a work tree."""
    text = read_diff(work)
    if old not in text:
        return False
    write_diff(work, text.replace(old, new))
    return True


def insert_diff(work, anchor, addition):
    """Insert a sentence after the first match of an anchor in the layout diff."""
    text = read_diff(work)
    if anchor not in text:
        return False
    write_diff(work, text.replace(anchor, anchor + " " + addition, 1))
    return True


def missing_directory(work):
    """Remove a directory that the spec layout names."""
    shutil.rmtree(tree(work) / "services" / "audit-service")
    return True


def stray_directory(work):
    """Add a top-level directory that the spec layout does not name."""
    (tree(work) / "stray").mkdir()
    return True


def empty_leaf(work):
    """Remove the placeholder from a leaf directory."""
    (tree(work) / "workers" / "scheduler-worker" / ".gitkeep").unlink()
    return True


def copied_spec_file(work):
    """Add a spec file that this task must omit."""
    (tree(work) / "models" / "model-registry.yaml").write_text("name: test\n")
    return True


def mismatched_copy(work):
    """Add a task 16 copy that does not match the layout diff."""
    path = tree(work) / "docs" / "architecture" / "layout-diff.md"
    path.write_text(read_diff(work).replace("apps/web |", "apps/other |"))
    return True


def mangled_copy(work):
    """Add a task 16 copy whose table holds no layout diff header."""
    path = tree(work) / "docs" / "architecture" / "layout-diff.md"
    path.write_text("# Layout\n\n| # | Kind | Entry | Path |\n|---|---|---|---|\n")
    return True


def false_citation_copy(work):
    """Add a task 16 copy that cites a spec line the record does not cite."""
    path = tree(work) / "docs" / "architecture" / "layout-diff.md"
    path.write_text(read_diff(work).replace("spec:916", "spec:999"))
    return True


def build_output(work):
    """Add the build output that the plan tasks produce."""
    modules = tree(work) / "apps" / "web" / "node_modules" / "left-pad"
    modules.mkdir(parents=True)
    (modules / "index.js").write_text("module.exports = 1;\n")
    build = tree(work) / "apps" / "web" / ".next" / "server" / "chunks"
    build.mkdir(parents=True)
    (build / "page.js").write_text("module.exports = 2;\n")
    venv = tree(work) / "services" / "audit-service" / ".venv" / "lib"
    venv.mkdir(parents=True)
    (venv / "site.pyc").write_text("binary\n")
    return True


def later_module_output(work):
    """Add the build output that the later plan modules produce."""
    storybook = tree(work) / "packages" / "design-system" / "storybook-static"
    storybook.mkdir(parents=True)
    (storybook / "index.html").write_text("<html></html>\n")
    report = tree(work) / "apps" / "web" / "playwright-report"
    report.mkdir(parents=True)
    (report / "report.json").write_text("{}\n")
    results = tree(work) / "apps" / "web" / "test-results"
    results.mkdir(parents=True)
    (results / "run.xml").write_text("<run></run>\n")
    egg = tree(work) / "services" / "document-service" / "document_service.egg-info"
    egg.mkdir(parents=True)
    (egg / "PKG-INFO").write_text("Name: document-service\n")
    for name in ("build", "dist", "coverage", "htmlcov", ".turbo"):
        folder = tree(work) / "apps" / "web" / name
        folder.mkdir(parents=True)
        (folder / "artifact.txt").write_text("output\n")
    return True


def unnamed_module_file(work):
    """Add a checker module that the extra paths section does not name."""
    (tree(work) / "tests" / "layout" / "extra_module.py").write_text('"""Extra."""\n')
    return True


def file_in_deferred_directory(work):
    """Add a file to the directory that the plan defers."""
    path = tree(work) / "infra" / "terraform" / "aws" / "main.tf"
    path.write_text('resource "null_resource" "main" {}\n')
    return True


def bare_placeholder(work):
    """Remove the header comment from a placeholder file."""
    (tree(work) / "services" / "audit-service" / ".gitkeep").write_text("")
    return True


def missing_gitignore(work):
    """Remove the ignore file from the repo root."""
    (work / ".gitignore").unlink()
    return True


def missing_artifact_pattern(work):
    """Remove the node_modules pattern from the repo root ignore file."""
    path = work / ".gitignore"
    lines = [
        line for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() != "**/node_modules/"
    ]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return True


def deep_source_directory(work):
    """Add a source directory that carries an output name below the package root."""
    path = tree(work) / "services" / "audit-service" / "src" / "build"
    path.mkdir(parents=True)
    (path / "model.py").write_text('"""Source."""\n')
    return True
