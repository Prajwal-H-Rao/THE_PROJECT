#!/usr/bin/env python3
"""Verifier for Layer 7: independent output and side-effect verification.

Module 04 Task 9: independent output and side-effect verification.
Spec:216 — injected instructions inside tool output cannot change policy.

This module provides evidence-based verification of tool results.
Returns three-state result: pass, fail, unknown.
"""

import json
from dataclasses import dataclass
from typing import Any, Dict, Literal, Optional


@dataclass
class Evidence:
    """Expected evidence for a tool output."""
    tool: str
    output_pattern: Dict[str, Any]  # Exact match pattern
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class SideEffectEvidence:
    """Expected side effect evidence."""
    effect_type: str  # "email_sent", "calendar_event", "file_write", etc.
    expected: Dict[str, Any]
    verifier: str  # External verifier identifier


@dataclass
class VerificationResult:
    """Three-state verification result."""
    status: Literal["pass", "fail", "unknown"]
    evidence: Optional[Dict[str, Any]] = None
    reason: str = ""


class EvidenceStore:
    """Mutable evidence store for tool output verification.
    
    Stores expected output patterns by tool for verification.
    """

    def __init__(self, initial_evidence: Optional[Dict[str, Evidence]] = None):
        self._evidence: Dict[str, Evidence] = {}
        if initial_evidence:
            self._evidence.update(initial_evidence)

    def get_evidence(self, tool: str) -> Optional[Evidence]:
        """Look up evidence for a tool."""
        return self._evidence.get(tool)

    def record_evidence(self, tool: str, output: Dict[str, Any], evidence: Evidence) -> None:
        """Record evidence for future verification."""
        self._evidence[tool] = evidence

    def has_evidence(self, tool: str) -> bool:
        """Check if evidence exists for tool."""
        return tool in self._evidence


class SideEffectVerifier:
    """Interface for side-effect verification.
    
    Subclasses implement verification of external side effects
    (email sent, calendar event, file write, etc.).
    """

    async def verify_side_effect(
        self,
        effect_type: str,
        expected: Dict[str, Any],
        context: Dict[str, Any]
    ) -> "VerificationResult":
        """Verify a side effect occurred.
        
        Override in subclass to implement actual verification
        against external systems (email API, calendar API, etc.).
        """
        return VerificationResult(
            status="unknown",
            reason=f"No verifier implemented for {self.__class__.__name__}"
        )


class Verifier:
    """Verifier for Layer 7: independent output and side-effect verification.
    
    Checks tool output against evidence store.
    Returns three-state result: pass, fail, unknown.
    """

    def __init__(self, evidence_store: Optional[EvidenceStore] = None):
        self.evidence_store = evidence_store or EvidenceStore()
        self.side_effect_verifiers: Dict[str, SideEffectVerifier] = {}

    def register_side_effect_verifier(self, effect_type: str, verifier: SideEffectVerifier) -> None:
        """Register a side-effect verifier for an effect type."""
        self.side_effect_verifiers[effect_type] = verifier

    def verify(
        self,
        tool: str,
        result: Dict[str, Any],
        expected: Dict[str, Any]
    ) -> bool:
        """Legacy boolean verification for backward compatibility.
        
        Returns True if evidence matches exactly, False otherwise.
        """
        return self.verify_detailed(tool, result, expected).status == "pass"

    def verify_detailed(
        self,
        tool: str,
        result: Dict[str, Any],
        expected: Dict[str, Any]
    ) -> "VerificationResult":
        """Three-state verification with evidence details.
        
        Returns VerificationResult with status: pass, fail, or unknown.
        """
        # Check for evidence for this tool
        evidence = self.evidence_store.get_evidence(tool)
        
        if evidence is None:
            return VerificationResult(
                status="unknown",
                reason=f"No evidence found for tool '{tool}'"
            )
        
        # Compare result against evidence pattern
        if self._matches_evidence(result, evidence.output_pattern):
            return VerificationResult(
                status="pass",
                evidence=evidence.output_pattern,
                reason="Output matches expected evidence"
            )
        
        return VerificationResult(
            status="fail",
            evidence=evidence.output_pattern,
            reason="Output contradicts expected evidence"
        )

    def verify_side_effects(
        self,
        effect_type: str,
        expected: Dict[str, Any],
        context: Dict[str, Any]
    ) -> "VerificationResult":
        """Verify a side effect using registered verifier."""
        verifier = self.side_effect_verifiers.get(effect_type)
        if verifier is None:
            return VerificationResult(
                status="unknown",
                reason=f"No side-effect verifier registered for '{effect_type}'"
            )
        # This would be called asynchronously in real implementation
        # For now, return unknown since we have no real verifiers
        return VerificationResult(
            status="unknown",
            reason=f"Side-effect verification not implemented for '{effect_type}'"
        )

    def _matches_evidence(self, output: Dict[str, Any], pattern: Dict[str, Any]) -> bool:
        """Check if output matches evidence pattern (exact match)."""
        # For now, exact match. Could be extended with pattern matching.
        return output == pattern


# Default empty evidence store for stub phase
DEFAULT_EVIDENCE_STORE = EvidenceStore()

# Default verifier instance for stub phase
DEFAULT_VERIFIER = Verifier(DEFAULT_EVIDENCE_STORE)