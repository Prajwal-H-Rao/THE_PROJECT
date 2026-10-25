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

# The design notes that the repo holds outside the tree. A module task updates the list.
DESIGN_NOTES = (
    "docs/design-notes/nova-api-gateway.md",
    "docs/design-notes/nova-object-store.md",
    "docs/design-notes/nova-llm-model-provider.md",
    "docs/design-notes/nova-backend-python.md",
    "docs/design-notes/nova-validation.md",
    "docs/design-notes/nova-database.md",
    "docs/design-notes/nova-queue.md",
    "docs/design-notes/nova-python-workers.md",
    "docs/design-notes/nova-frontend.md",
    "docs/design-notes/nova-auth.md",
    "docs/design-notes/nova-agent-workflow.md",
    "docs/design-notes/nova-mcp-surface.md",
    "docs/design-notes/nova-model-gateway.md",
    "docs/design-notes/nova-document-parsing.md",
    "docs/design-notes/nova-observability.md",
    "docs/design-notes/nova-packaging.md",
    "docs/design-notes/nova-orchestration.md",
    "docs/design-notes/nova-monitoring.md",
    "docs/design-notes/nova-approval-grants.md",
)


def expected_groups(index):
    """Return the path names that each path group must state."""
    return [
        [spec_index.RECORD_PATH],
        sorted(index.implied_parents),
        [tree_checks.CHECKER_DIRECTORY] + checker_modules(),
        [tree_checks.PLACEHOLDER_NAME],
        repo_files(),
        [tree_checks.TEMPLATE_DIRECTORY],
        list(DESIGN_NOTES),
        ["infra/edge/Caddyfile", "infra/edge/README.md"],
        ["packages/contracts/migrations/runner.ts", "packages/contracts/migrations/runner.test.ts"] +
        [f"packages/contracts/migrations/{i:02d}-{name}.sql" for i, name in [
            (1, "roles-and-schemas"), (2, "identity-schema"), (3, "audit-schema"),
            (4, "policy-schema"), (5, "inbox-schema"), (6, "tasks-schema"),
            (7, "finance-schema"), (8, "trips-schema"), (9, "jobs-schema"),
            (10, "registry-schema"), (11, "export-deletion"), (12, "indexes"),
            (13, "audit-search"), (14, "password-reset-tokens"), (15, "refresh-tokens"),
            (16, "scopes"), (17, "resource-ownership"), (18, "key-rotation"),
            (19, "account-linking"), (20, "unlink-revoke"), (21, "rate-limiting"),
            (22, "cors-csp-limits-ssrf"), (23, "rbac-roles"), (24, "approval-grants"), (25, "approval-card")
        ]],
        ["packages/contracts/events/event-envelope.ts", "packages/contracts/events/event-consumers.ts",
         "packages/contracts/events/event-envelope.test.ts", "packages/contracts/events/event-consumers.test.ts",
         "packages/contracts/events/event-envelope.compat.test.ts",
         "packages/contracts/grant-verification.ts", "packages/contracts/grant-verification.test.ts"],
        ["infra/scripts/backup.sh", "infra/scripts/restore.sh", "infra/scripts/backup-drill.sh",
         "docs/privacy-review.md"],
        ["labs/lab01/validate-openapi.js", "labs/lab01/fixtures/api-gateway-health-live.json",
         "labs/lab01/fixtures/api-gateway-health-ready.json", "labs/lab01/fixtures/typescript-template-health-live.json",
         "labs/lab01/fixtures/typescript-template-health-ready.json", "labs/registry.yaml"],
        ["THIRD_PARTY.md"],
        [".github/workflows/labs.yml"],
        [
            "services/identity-service/nest-cli.json",
            "services/identity-service/package.json",
            "services/identity-service/package-lock.json",
            "services/identity-service/tsconfig.json",
            "services/identity-service/src/app.module.ts",
            "services/identity-service/src/main.ts",
            "services/identity-service/src/auth/auth.controller.ts",
            "services/identity-service/src/auth/auth.module.ts",
            "services/identity-service/src/auth/oidc.service.ts",
            "services/identity-service/src/auth/oidc-state.store.ts",
            "services/identity-service/src/db/db.module.ts",
            "services/identity-service/src/health/health.controller.ts",
            "services/identity-service/src/health/health.module.ts",
            "services/identity-service/src/session/session.module.ts",
            "services/identity-service/src/session/session.repository.ts",
            "services/identity-service/src/session/session.service.ts",
            "services/identity-service/src/session/session.tokens.ts",
            "services/identity-service/src/session/session.tokens.test.ts",
            "services/identity-service/src/account/account.module.ts",
            "services/identity-service/src/account/user.repository.ts",
            "services/identity-service/src/totp/totp.controller.ts",
            "services/identity-service/src/totp/totp.module.ts",
            "services/identity-service/src/totp/totp.service.ts",
        ],
        [
            "services/policy-approval-service/nest-cli.json",
            "services/policy-approval-service/package.json",
            "services/policy-approval-service/package-lock.json",
            "services/policy-approval-service/tsconfig.json",
            "services/policy-approval-service/src/app.module.ts",
            "services/policy-approval-service/src/main.ts",
            "services/policy-approval-service/src/approval/grant-binding.ts",
            "services/policy-approval-service/src/approval/grant-repository-types.ts",
            "services/policy-approval-service/src/approval/grant-repository.ts",
            "services/policy-approval-service/src/approval/grant-card.ts",
            "services/policy-approval-service/src/approval/grant-creation.ts",
            "services/policy-approval-service/src/approval/grant-outcomes.ts",
            "services/policy-approval-service/src/approval/grants.service.ts",
            "services/policy-approval-service/src/approval/grants.controller.ts",
            "services/policy-approval-service/src/approval/grants.module.ts",
            "services/policy-approval-service/src/approval/grants.test.ts",
            "services/policy-approval-service/src/policy/policy-schema.ts",
            "services/policy-approval-service/src/policy/policy-loader.ts",
            "services/policy-approval-service/src/policy/policy-loader.test.ts",
            "services/policy-approval-service/src/policy/policy-decision.service.ts",
            "services/policy-approval-service/src/policy/policy-decision.service.test.ts",
            "services/policy-approval-service/src/policy/policy-schema.test.ts",
            "services/policy-approval-service/src/policy/policy.controller.ts",
            "services/policy-approval-service/src/policy/policy.module.ts",
            "services/policy-approval-service/src/policy/families.yaml",
            "services/policy-approval-service/src/health/health.controller.ts",
            "services/policy-approval-service/src/health/health.module.ts",
        ],
        [
            "services/audit-service/nest-cli.json",
            "services/audit-service/package.json",
            "services/audit-service/package-lock.json",
            "services/audit-service/tsconfig.json",
            "services/audit-service/src/app.module.ts",
            "services/audit-service/src/main.ts",
            "services/audit-service/src/audit-repository.ts",
            "services/audit-service/src/audit.controller.ts",
            "services/audit-service/src/audit.module.ts",
            "services/audit-service/src/audit.service.ts",
            "services/audit-service/src/health/health.controller.ts",
            "services/audit-service/src/health/health.module.ts",
        ],
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
