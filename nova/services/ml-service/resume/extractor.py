"""NLP-style extraction over parsed resume text (task 06.21).

Pure stdlib: keyword-based skill/experience extraction with source spans.
Each extracted item carries a source_span (char_start, char_end) so it can
be resolved against stored spans (spec:226, spec:523). Unsupported fields
stay unknown instead of being inferred.

This is a deterministic placeholder extractor; a trained NLP model can be
plugged in through the same extract_* / resolve_span contract without
changing the span semantics.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class ExtractedSkill:
    skill: str
    category: str | None
    confidence: float
    source_span: dict[str, int]


@dataclass(frozen=True)
class ExtractedExperience:
    role: str
    employer: str | None
    dates: str | None
    source_span: dict[str, int]


# Keyword index: skill keyword -> category.
_SKILL_KEYWORDS = {
    "python": "programming",
    "java": "programming",
    "javascript": "programming",
    "typescript": "programming",
    "go": "programming",
    "rust": "programming",
    "c++": "programming",
    "c#": "programming",
    "react": "frameworks",
    "vue": "frameworks",
    "angular": "frameworks",
    "django": "frameworks",
    "flask": "frameworks",
    "fastapi": "frameworks",
    "spring": "frameworks",
    "express": "frameworks",
    "postgresql": "databases",
    "mysql": "databases",
    "mongodb": "databases",
    "redis": "databases",
    "elasticsearch": "databases",
    "sqlite": "databases",
    "aws": "cloud",
    "gcp": "cloud",
    "azure": "cloud",
    "docker": "cloud",
    "kubernetes": "cloud",
    "terraform": "cloud",
    "pytorch": "ml",
    "tensorflow": "ml",
    "scikit-learn": "ml",
    "pandas": "ml",
    "numpy": "ml",
    "huggingface": "ml",
}


def extract_skills(text: str) -> list[dict]:
    """Extract skills from text, each carrying a source_span."""
    text_lower = text.lower()
    skills: list[dict] = []
    seen: set[str] = set()
    for keyword, category in _SKILL_KEYWORDS.items():
        if keyword in seen:
            continue
        start = text_lower.find(keyword)
        if start == -1:
            continue
        seen.add(keyword)
        skills.append({
            "skill": keyword,
            "category": category,
            "confidence": 0.8,
            "source_span": {"char_start": start, "char_end": start + len(keyword)},
        })
    return skills


def extract_experience(text: str) -> list[dict]:
    """Extract experience entries from text, each carrying a source_span."""
    experiences: list[dict] = []
    # Very coarse heuristic: look for a role/employer/date cluster.
    import re
    # Match "Role at Employer, YYYY-YYYY" style clusters.
    pattern = re.compile(
        r"([A-Za-z][A-Za-z0-9 _\-/]+?)\s+at\s+([A-Za-z0-9][A-Za-z0-9 _\-&\.]+?),?\s*(\d{4})\s*[-–]\s*(\d{4}|present)"
    )
    for match in pattern.finditer(text):
        role = match.group(1).strip()
        employer = match.group(2).strip()
        start = match.start()
        end = match.end()
        experiences.append({
            "role": role,
            "employer": employer,
            "dates": f"{match.group(3)}-{match.group(4)}",
            "source_span": {"char_start": start, "char_end": end},
        })
    return experiences


def resolve_span(source_span: dict[str, int], stored_spans: dict) -> bool:
    """Return True when source_span's char range is within a stored span."""
    start = source_span.get("char_start", 0)
    end = source_span.get("char_end", 0)
    for stored in stored_spans.values():
        s_start = stored.get("char_start", 0)
        s_end = stored.get("char_end", 0)
        if s_start <= start and end <= s_end:
            return True
    return False


def unknown_field(field_name: str) -> dict:
    """Return an unknown-state field dict for an unsupported field."""
    return {
        "field_name": field_name,
        "state": "unknown",
        "message": f"No evidence for field {field_name!r}; left unknown.",
    }
