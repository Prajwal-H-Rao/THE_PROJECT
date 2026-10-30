#!/usr/bin/env python3
"""Single-source action keyword table for the deterministic router.

The table maps every canonical family to its actions, and every action to
regex keyword fragments. Both the family match patterns and the within-family
action detection derive from this one table, so a keyword edit cannot drift
between the two (Module 04 task 4, scope clarification never inference).

Action keys mirror the rule ids in policy-approval-service families YAML
(e.g. "calendar_tasks.create_event"), so tests can cross-check for drift.
Pattern text is trusted: it is an internal constant, not user input.
"""

from typing import Dict, List

# The canonical families in policy order (must match the families YAML).
FAMILIES = [
    "inbox",
    "calendar_tasks",
    "notes_memory",
    "finance",
    "trips",
    "resume_jobs",
    "integrations",
]

# family -> action -> keyword regex fragments. "_family" holds the generic
# family nouns: they feed family matching but never select an action.
TASK_ACTIONS: Dict[str, Dict[str, List[str]]] = {
    "inbox": {
        "_family": [
            r"emails?", r"inbox", r"mails?", r"messages?", r"unread", r"draft",
            r"attachment", r"spam", r"archive",
        ],
        "read": [r"read\s+(?:\w+\s+)*(?:emails?|mails?|messages?|inbox)", r"(?:show|open|view)\s+(?:\w+\s+)*(?:emails?|inbox)"],
        "draft": [r"draft\s+(?:\w+\s+)*(?:emails?|mails?|messages?)", r"draft\b"],
        "send": [r"send\s+(?:\w+\s+)*(?:emails?|messages?)"],
    },
    "calendar_tasks": {
        "_family": [
            r"calendar", r"events?", r"appointments?", r"remind", r"due date", r"deadline",
            r"agenda",
        ],
        "read": [r"(?:show|view|read)\s+(?:\w+\s+)*(?:calendar|events?|agenda)"],
        "create_event": [r"create\s+(?:\w+\s+)*(?:events?|meetings?)", r"meetings?", r"schedule\s+(?:\w+\s+)*(?:events?|meetings?)"],
        "create_task": [r"create\s+(?:\w+\s+)*tasks?", r"\btasks?\b", r"\btodos?\b"],
        "invite": [r"invite"],
        "update_event": [r"update\s+(?:\w+\s+)*events?", r"reschedule\s+(?:\w+\s+)*events?"],
        "update_task": [r"update\s+(?:\w+\s+)*tasks?"],
        "cancel_event": [r"cancel\s+(?:\w+\s+)*(?:events?|meetings?)"],
        "cancel_task": [r"cancel\s+(?:\w+\s+)*tasks?"],
    },
    "notes_memory": {
        "_family": [
            r"notes?", r"remember", r"memory", r"knowledge base",
        ],
        "search": [r"search\s+(?:\w+\s+)*notes?"],
        "create": [r"create\s+(?:\w+\s+)*notes?"],
        "update": [r"update\s+(?:\w+\s+)*notes?"],
        "export": [r"export\s+(?:\w+\s+)*notes?", r"export"],
        "delete": [r"delete\s+(?:\w+\s+)*notes?", r"delete"],
    },
    "finance": {
        "_family": [
            r"finance", r"transactions?", r"expenses?", r"spending",
            r"statements?", r"accounts?", r"balances?", r"income", r"cost",
        ],
        "read": [r"(?:show|view|read|list)\s+(?:\w+\s+)*(?:transactions?|statements?|balances?|expenses?)"],
        "import": [r"import"],
        "categorize": [r"categorize"],
        "budget": [r"budget"],
        "summarize": [r"summarize"],
    },
    "trips": {
        "_family": [
            r"trips?", r"travel", r"routes?", r"flights?", r"hotels?", r"itinerar(?:y|ies)",
            r"directions?", r"maps?", r"distance", r"commute",
        ],
        "read": [r"(?:show|view|read)\s+(?:\w+\s+)*(?:trips?|flights?|itinerar(?:y|ies))"],
        "write": [r"plan\s+(?:\w+\s+)*trips?"],
        "compare": [r"compare"],
    },
    "resume_jobs": {
        "_family": [
            r"jobs?", r"resume", r"\bcvs?\b", r"applications?", r"career",
            r"interviews?", r"cover letter", r"linkedin", r"roles?",
        ],
        "search": [r"search\s+(?:\w+\s+)*jobs?", r"find\s+(?:\w+\s+)*jobs?"],
        "match": [r"match(?:es)?"],
        "apply": [r"applies|applied|apply\b", r"submit\s+(?:\w+\s+)*applications?"],
        "draft": [r"draft\s+(?:\w+\s+)*(?:resume|cvs?|cover letter)"],
        "track": [r"track"],
    },
    "integrations": {
        "_family": [
            r"integration", r"telegram", r"whatsapp", r"channels?",
            r"notifications?", r"automation", r"webhooks?", r"api keys?",
            r"settings", r"security", r"passwords?", r"2fa", r"totp",
            r"session",
        ],
        "link": [r"connects?\b|connected", r"\blinks?\b", r"link\s+(?:\w+\s+)*accounts?"],
        "send": [r"send\s+(?:\w+\s+)*(?:notifications?|channels?\s+messages?)"],
        "configure": [r"configure", r"setup", r"set\s+up"],
        "audit": [r"audit"],
        "security": [r"security\s+(?:\w+\s+)*review"],
    },
}


def derive_family_keywords() -> Dict[str, List[str]]:
    """Derive the family keyword lists from the action table (single source)."""
    keywords: Dict[str, List[str]] = {}
    for family, actions in TASK_ACTIONS.items():
        parts: List[str] = []
        for fragments in actions.values():
            parts.extend(fragments)
        keywords[family] = parts
    return keywords
