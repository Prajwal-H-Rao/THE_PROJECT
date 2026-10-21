"""Check the path claims of the layout diff record. Verify the groups and the ignored paths."""

import re
from pathlib import Path

import ci_checks
import ignored_paths
import repo_checks
import spec_index
import tree_checks

IGNORED_SENTENCE = "The always ignored names are "
OUTPUT_SENTENCE = "The ignored output names are "
IGNORED_DIRECTORY_SUFFIX_SENTENCE = "The ignored directory suffixes are "
IGNORED_FILES_SENTENCE = "The ignored files are "
IGNORED_TEMPORARY_SENTENCE = "The ignored temporary files are "
IGNORED_FILE_SUFFIX_SENTENCE = "The ignored file suffixes are "

# The path group count and the group sentences of the extra paths section.
GROUP_COUNT = re.compile(r"This task adds (\d+) path groups")
GROUP_SENTENCE = re.compile(r"The ([a-z]+) is (.+)")

# The number words that a group sentence may use.
NUMBER_WORDS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
}

# The ordinal of each path group, in order.
ORDINALS = ("first", "second", "third", "fourth", "fifth", "sixth", "seventh")

# The file suffixes that mark a word as a file name.
FILE_SUFFIXES = (".py", ".toml", ".yml", ".yaml", ".json", ".md", ".sh", ".lock")

# The file names that carry no suffix. The record may name them.
EXTENSIONLESS_NAMES = ("Makefile", "LICENSE", "CODEOWNERS", "Dockerfile")


def expected_groups(index):
    """Return the path names that each path group must state."""
    return [
        [spec_index.RECORD_PATH],
        sorted(index.implied_parents),
        [tree_checks.CHECKER_DIRECTORY] + checker_modules(),
        [tree_checks.PLACEHOLDER_NAME],
        repo_files(),
        [tree_checks.TEMPLATE_DIRECTORY],
    ]


def checker_modules():
    """Return the names of the checker modules."""
    root = Path(__file__).parent
    return sorted(
        path.name for path in root.glob("*.py")
        if not ignored_paths.is_ignored(path.relative_to(spec_index.TREE_ROOT).as_posix())
    )


def repo_files():
    """Return the names of the repo root files that the record must name."""
    return sorted([
        ci_checks.CONFIG_PATH.as_posix(),
        ci_checks.WORKFLOW_PATH.as_posix(),
        repo_checks.IGNORE_FILE_NAME,
    ])


def group_sentences(section):
    """Return the ordinal and the text of every path group sentence, in order."""
    found = []
    for sentence in section.split(". "):
        text = sentence.strip()
        match = GROUP_SENTENCE.match(text)
        if match:
            found.append((match.group(1), match.group(2).strip()))
    return found


def path_names(text):
    """Return the path names that a sentence states."""
    names = set()
    for word in text.split():
        # A name keeps its leading dot. Only the trailing punctuation goes.
        name = word.strip("\"'()[]`").rstrip(".,;:").rstrip("/")
        if "/" in name or name.startswith(".") or name.endswith(FILE_SUFFIXES):
            names.add(name)
        elif name in EXTENSIONLESS_NAMES:
            names.add(name)
    return names


def check_extra_paths(index, extra):
    """Check that the extra paths section states every path group that the tree holds."""
    problems = []
    expected = expected_groups(index)
    groups = group_sentences(extra)
    if len(groups) != len(expected):
        problems.append("the extra paths section states %d path groups, not %d" % (
            len(groups), len(expected)))
    for count in GROUP_COUNT.findall(extra):
        if int(count) != len(expected):
            problems.append("the extra paths section states %s path groups, not %d" % (
                count, len(expected)))
    for position, names in enumerate(expected):
        if position >= len(groups):
            break
        ordinal, text = groups[position]
        if position < len(ORDINALS) and ordinal != ORDINALS[position]:
            problems.append("path group %d holds the ordinal %s" % (
                position + 1, ordinal))
        stated = path_names(text)
        missing = [name for name in names if name not in stated]
        extra_names = sorted(stated - set(names))
        if missing:
            problems.append("path group %d does not name: %s" % (
                position + 1, ", ".join(missing)))
        if extra_names:
            problems.append("path group %d names an extra path: %s" % (
                position + 1, ", ".join(extra_names)))
        problems += group_count_problems(text, len(names))
    if problems:
        return "; ".join(problems)
    return None


def group_count_problems(text, count):
    """Return the problems of a group sentence that states the wrong number of names."""
    match = re.search(r"\b(one|two|three|four|five|six|seven)\b", text)
    if match is None:
        return []
    if NUMBER_WORDS[match.group(1)] != count:
        return ["path group states %s names, not %d" % (match.group(1), count)]
    return []


def check_ignored_paths(extra):
    """Check that the extra paths section states the paths that the checker skips."""
    problems = []
    problems += list_problems(
        extra, IGNORED_SENTENCE, ignored_paths.ALWAYS_IGNORED, "always ignored names")
    problems += list_problems(
        extra, OUTPUT_SENTENCE, ignored_paths.OUTPUT_NAMES, "ignored output names")
    problems += list_problems(
        extra, IGNORED_DIRECTORY_SUFFIX_SENTENCE,
        ignored_paths.IGNORED_DIRECTORY_SUFFIXES, "ignored directory suffixes")
    problems += list_problems(
        extra, IGNORED_FILES_SENTENCE, ignored_paths.IGNORED_FILES, "ignored files")
    problems += list_problems(
        extra, IGNORED_TEMPORARY_SENTENCE,
        ignored_paths.IGNORED_TEMPORARY_FILES, "ignored temporary files")
    problems += list_problems(
        extra, IGNORED_FILE_SUFFIX_SENTENCE,
        ignored_paths.IGNORED_FILE_SUFFIXES, "ignored file suffixes")
    if problems:
        return "; ".join(problems)
    return None


def list_problems(extra, prefix, expected, label):
    """Return the problems of every list of names that the section states."""
    lists = stated_lists(extra, prefix)
    if not lists:
        return ["the extra paths section states no %s" % label]
    problems = []
    for stated in lists:
        if stated != sorted(expected):
            problems.append("the extra paths section states the %s %s, not %s" % (
                label, stated, sorted(expected)))
    return problems


def stated_lists(extra, prefix):
    """Return every list of names that the section states for one prefix."""
    found = []
    for sentence in extra.split(". "):
        text = sentence.strip()
        if not text.startswith(prefix):
            continue
        text = text[len(prefix):].strip().rstrip(".")
        parts = text.replace(",", " and ").split(" and ")
        found.append(sorted(part.strip() for part in parts if part.strip()))
    return found
