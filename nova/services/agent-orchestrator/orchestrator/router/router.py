#!/usr/bin/env python3
"""Deterministic router: natural language → task family + model tier.

The router uses keyword matching to map user input to one of the 7 canonical
task families. It does NOT make authorization decisions; the policy service
owns that. This router only classifies intent.

Ambiguous in-scope requests return a clarification response, never an inferred
action (Module 04 task 4, spec:200). Out-of-scope requests return a fixed
refusal. Keywords live in action_table.py as the single source for both family
patterns and action detection.
"""

import json
import logging
import re
from dataclasses import dataclass
from typing import Dict, Optional, Literal
from pathlib import Path

from action_table import TASK_ACTIONS, FAMILIES, derive_family_keywords

logger = logging.getLogger(__name__)

# Load the model registry for tier mapping
REGISTRY_PATH = Path(__file__).parent.parent.parent.parent / "models" / "model-registry.yaml"

# Actions that indicate write/consequential intent
WRITE_ACTIONS = [
    "create", "send", "write", "draft", "import", "apply", "link", "connect",
    "invite", "cancel", "delete", "update", "configure", "setup",
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
            # Fail closed to the planner tier: the slowest, most capable path.
            return {f: "planner" for f in FAMILIES}

    def _compile_patterns(self):
        """Compile family and action patterns from the single action table."""
        keywords = derive_family_keywords()
        self.patterns = {}
        for family, family_keywords in keywords.items():
            # Sort by length descending for more specific matches first
            sorted_keywords = sorted(family_keywords, key=len, reverse=True)
            pattern = r"\b(" + "|".join(sorted_keywords) + r")\b"
            self.patterns[family] = re.compile(pattern, re.IGNORECASE)
        # Compile one regex per action: alternation of its fragments.
        self.action_patterns = {
            family: {
                action: [re.compile(rf, re.IGNORECASE) for rf in fragments]
                for action, fragments in actions.items() if action != "_family"
            }
            for family, actions in TASK_ACTIONS.items()
        }

    def _detect_action_type(self, text: str) -> Literal["read", "write", "consequential"]:
        """Detect if the request implies read, write, or consequential action."""
        text_lower = text.lower()

        # Check for consequential keywords (send, submit, connect):
        # the 3 consequential tools per Module 03 tasks 4. Flexible patterns
        # allow words between key terms.
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
        return "read"

    def _matched_actions(self, family: str, text: str) -> list:
        """Return the actions of one family whose keywords match the text."""
        matched = []
        for action, patterns in self.action_patterns.get(family, {}).items():
            if any(p.search(text) for p in patterns):
                matched.append(action)
        return matched

    def _match_family(self, text: str) -> list:
        """Match text against family keywords, return (family, count) sorted."""
        matches = []
        for family, pattern in self.patterns.items():
            match_count = len(pattern.findall(text))
            if match_count > 0:
                matches.append((family, match_count))
        matches.sort(key=lambda x: x[1], reverse=True)
        return matches

    def _clarify(self, confidence: float, question: str) -> RouterResult:
        """Build an ambiguous result that asks, and never acts."""
        return RouterResult(family=None, tier=None, confidence=confidence,
                            action_type="ambiguous", clarification=question)

    def route(self, text: str) -> RouterResult:
        """Route text, failing closed: an unexpected error returns a fixed refusal."""
        try:
            return self._route(text)
        except Exception:
            # WHY: spec:199/200 require a stop before planning with a fixed
            # refusal; a crash must never leak a partial classification onward.
            logger.exception("router crashed; returning fixed refusal")
            return RouterResult(
                family=None, tier=None, confidence=0.0, action_type="refusal",
                refusal_reason="This request could not be processed. Please rephrase it.",
            )

    def _route(self, text: str) -> RouterResult:
        """Classify one text against the action table."""
        if not text or not text.strip():
            return RouterResult(family=None, tier=None, confidence=0.0,
                                action_type="refusal", refusal_reason="Empty request")

        text_lower = text.lower().strip()
        action_type = self._detect_action_type(text_lower)
        matches = self._match_family(text_lower)

        if not matches:
            return RouterResult(
                family=None, tier=None, confidence=0.0, action_type="refusal",
                refusal_reason="I can help with email, calendar, tasks, notes, finance, trips, jobs, or integrations. What would you like to do?",
            )

        # Ambiguity check 1: several families with equal match counts.
        if len(matches) > 1 and matches[0][1] == matches[1][1]:
            names = ", ".join(m[0].replace("_", " ") for m in matches[:3])
            return self._clarify(0.5, f"Did you mean {names}? Please clarify.")

        # Single best family: check within-family action ambiguity.
        # Two or more matched actions -> ask. Zero matched actions -> ask.
        # Never infer an action that the table does not name.
        best_family = matches[0][0]
        matched_actions = self._matched_actions(best_family, text_lower)

        if len(matched_actions) == 0:
            label = best_family.replace("_", " ")
            return self._clarify(0.4, f"What would you like me to do with your {label}? Please name the action.")
        if len(matched_actions) > 1:
            names = ", ".join(a.replace("_", " ") for a in matched_actions)
            return self._clarify(0.5, f"Did you mean {names}? Please clarify.")

        # One unambiguous action: route with the family tier.
        tier = self.routing_policy.get(best_family, "planner")
        # For consequential actions, always use planner tier (never classifier_only)
        if action_type == "consequential" and tier == "classifier_only":
            tier = "planner"
        return RouterResult(family=best_family, tier=tier,
                            confidence=min(0.9, 0.5 + matches[0][1] * 0.1),
                            action_type=action_type)


if __name__ == "__main__":
    import sys
    router = DeterministicRouter()
    text = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else sys.stdin.read()
    result = router.route(text)
    print(json.dumps(result.__dict__, indent=2))
