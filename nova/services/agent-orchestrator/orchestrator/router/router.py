#!/usr/bin/env python3
"""Deterministic router: natural language → task family + model tier.

This router uses keyword matching to map user input to one of the 7
canonical task families. It does NOT make authorization decisions;
that is the policy service's job. The router only classifies intent.

Ambiguous in-scope requests return a clarification response.
Out-of-scope requests return a fixed refusal.
"""

import json
import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Literal
from pathlib import Path

# Load the model registry for tier mapping
REGISTRY_PATH = Path(__file__).parent.parent.parent.parent / "models" / "model-registry.yaml"

# Canonical families (must match policy families.yaml)
FAMILIES = [
    "inbox",
    "calendar_tasks",
    "notes_memory",
    "finance",
    "trips",
    "resume_jobs",
    "integrations",
]

# Keywords for each family (ordered by specificity)
FAMILY_KEYWORDS: Dict[str, List[str]] = {
    "inbox": [
        "email", "inbox", "mail", "message", "unread", "draft", "send email",
        "reply", "forward", "attachment", "spam", "archive",
    ],
    "calendar_tasks": [
        "calendar", "event", "meeting", "appointment", "schedule", "remind",
        "task", "todo", "due date", "deadline", "create event", "invite",
        "cancel event", "reschedule", "agenda",
    ],
    "notes_memory": [
        "note", "notes", "remember", "memory", "search note", "create note",
        "update note", "delete note", "export note", "knowledge base",
    ],
    "finance": [
        "finance", "transaction", "expense", "budget", "spending", "import",
        "categorize", "statement", "account", "balance", "income", "cost",
    ],
    "trips": [
        "trip", "travel", "route", "flight", "hotel", "itinerary", "plan trip",
        "compare", "direction", "maps", "distance", "commute",
    ],
    "resume_jobs": [
        "job", "jobs", "resume", "cv", "apply", "application", "career",
        "search job", "match", "interview", "cover letter", "linkedin",
    ],
    "integrations": [
        "integration", "connect", "link", "telegram", "whatsapp", "channel",
        "notification", "automation", "webhook", "api key", "settings",
        "security", "session", "password", "2fa", "totp",
    ],
}

# Actions that indicate write/consequential intent
WRITE_ACTIONS = [
    "create", "send", "write", "draft", "import", "apply", "link", "connect",
    "invite", "cancel", "delete", "update", "configure", "setup",
]

# Actions that indicate read-only intent
READ_ACTIONS = [
    "read", "list", "search", "view", "show", "get", "find", "browse",
    "export", "track", "compare",
]


@dataclass
class RouterResult:
    """Result of routing a user request."""
    family: Optional[str]
    tier: Optional[str]
    confidence: float
    action_type: Literal["read", "write", "consequential", "ambiguous", "refusal"]
    clarification: Optional[str] = None
    refusal_reason: Optional[str] = None


class DeterministicRouter:
    """Deterministic keyword-based router for NOVA task families."""

    def __init__(self, registry_path: Optional[Path] = None):
        self.registry_path = registry_path or REGISTRY_PATH
        self.routing_policy = self._load_routing_policy()
        self._compile_patterns()

    def _load_routing_policy(self) -> Dict[str, str]:
        """Load family→tier mapping from model-registry.yaml."""
        try:
            import yaml
            with open(self.registry_path) as f:
                data = yaml.safe_load(f)
            return data.get("routing_policy", {}).get("family_tiers", {})
        except Exception:
            # Fallback to default planner for all families
            return {f: "planner" for f in FAMILIES}

    def _compile_patterns(self):
        """Compile keyword patterns for each family."""
        self.patterns = {}
        for family, keywords in FAMILY_KEYWORDS.items():
            # Sort by length descending for more specific matches first
            sorted_keywords = sorted(keywords, key=len, reverse=True)
            pattern = r"\b(" + "|".join(re.escape(k) for k in sorted_keywords) + r")\b"
            self.patterns[family] = re.compile(pattern, re.IGNORECASE)

    def _detect_action_type(self, text: str) -> Literal["read", "write", "consequential"]:
        """Detect if the request implies read, write, or consequential action."""
        text_lower = text.lower()
        
        # Check for consequential keywords (send, submit, connect)
        # These are the 3 consequential tools per Module 03 tasks 4
        # Use flexible patterns that allow words between key terms
        consequential_patterns = [
            r"send\s+(?:\w+\s+)*email",
            r"send\s+(?:\w+\s+)*message",
            r"submit\s+(?:\w+\s+)*application",
            r"connect\s+(?:\w+\s+)*account",
        ]
        for pattern in consequential_patterns:
            if re.search(pattern, text_lower):
                return "consequential"
        
        # Check for write actions
        for kw in WRITE_ACTIONS:
            if re.search(r"\b" + re.escape(kw) + r"\b", text_lower):
                return "write"
        
        # Default to read
        return "read"

    def _match_family(self, text: str) -> List[tuple[str, int]]:
        """Match text against family keywords, return (family, match_count) sorted by count."""
        matches = []
        for family, pattern in self.patterns.items():
            match_count = len(pattern.findall(text))
            if match_count > 0:
                matches.append((family, match_count))
        # Sort by match count descending
        matches.sort(key=lambda x: x[1], reverse=True)
        return matches

    def route(self, text: str) -> RouterResult:
        """Route natural language text to a task family and tier."""
        if not text or not text.strip():
            return RouterResult(
                family=None,
                tier=None,
                confidence=0.0,
                action_type="refusal",
                refusal_reason="Empty request",
            )

        text_lower = text.lower().strip()
        
        # Detect action type
        action_type = self._detect_action_type(text_lower)
        
        # Match against family keywords
        matches = self._match_family(text_lower)
        
        if not matches:
            # No family matched - out of scope
            return RouterResult(
                family=None,
                tier=None,
                confidence=0.0,
                action_type="refusal",
                refusal_reason="I can help with email, calendar, tasks, notes, finance, trips, jobs, or integrations. What would you like to do?",
            )
        
        # Check for ambiguity: multiple families with similar match counts
        if len(matches) > 1 and matches[0][1] == matches[1][1]:
            # Ambiguous - ask for clarification
            family_names = [m[0].replace("_", " ") for m in matches[:3]]
            return RouterResult(
                family=None,
                tier=None,
                confidence=0.5,
                action_type="ambiguous",
                clarification=f"Did you mean {', '.join(family_names)}? Please clarify.",
            )
        
        # Single best match
        best_family = matches[0][0]
        tier = self.routing_policy.get(best_family, "planner")
        
        # For consequential actions, always use planner tier (never classifier_only)
        if action_type == "consequential" and tier == "classifier_only":
            tier = "planner"
        
        confidence = min(0.9, 0.5 + matches[0][1] * 0.1)
        
        return RouterResult(
            family=best_family,
            tier=tier,
            confidence=confidence,
            action_type=action_type,
        )


def main():
    """CLI for testing the router."""
    import sys
    router = DeterministicRouter()
    
    if len(sys.argv) > 1:
        text = " ".join(sys.argv[1:])
    else:
        text = sys.stdin.read()
    
    result = router.route(text)
    print(json.dumps({
        "family": result.family,
        "tier": result.tier,
        "confidence": result.confidence,
        "action_type": result.action_type,
        "clarification": result.clarification,
        "refusal_reason": result.refusal_reason,
    }, indent=2))


if __name__ == "__main__":
    main()