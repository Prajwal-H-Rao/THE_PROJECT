"""Test for task 06.21: skills/experience extraction with source span.

stdlib-only: loads extractor.py by file path (pure stdlib; the parent
ml-service package imports flask/pydantic which are not installed here) and
asserts every extracted skill resolves to a stored span and an unsupported
field stays unknown. Runs with plain python3.
Spec:226 (extract skills, experience), spec:523 (unknown fields remain unknown).
"""

import importlib.util
import pathlib

EXTRACTOR_PATH = (
    pathlib.Path(__file__).resolve().parents[2]
    / "services"
    / "ml-service"
    / "resume"
    / "extractor.py"
)


def load_extractor():
    """Load extractor.py as a standalone module."""
    spec = importlib.util.spec_from_file_location("resume_extractor", EXTRACTOR_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_every_extracted_skill_resolves_to_a_stored_span() -> None:
    """Acceptance: every extracted skill resolves to a stored span."""
    extractor = load_extractor()
    text = "Python developer with AWS and PostgreSQL experience."
    stored_spans = {
        "skill-python": {"char_start": 0, "char_end": 6},
        "skill-aws": {"char_start": 22, "char_end": 25},
        "skill-postgresql": {"char_start": 30, "char_end": 40},
    }
    skills = extractor.extract_skills(text)
    assert skills, "expected skills to be extracted"
    for skill in skills:
        span = skill["source_span"]
        assert extractor.resolve_span(span, stored_spans), (
            f"skill {skill['skill']!r} span {span} does not resolve to a stored span"
        )


def test_unsupported_field_stays_unknown() -> None:
    """Acceptance: an unsupported field stays unknown."""
    extractor = load_extractor()
    field = extractor.unknown_field("work_authorisation")
    assert field["state"] == "unknown", field


def test_extract_experience_carries_source_span() -> None:
    """Extracted experience entries carry a source span."""
    extractor = load_extractor()
    text = "Software Engineer at Acme Corp, 2020-2023."
    exps = extractor.extract_experience(text)
    assert exps, "expected experience to be extracted"
    for exp in exps:
        assert "source_span" in exp, exp
        assert "char_start" in exp["source_span"], exp
        assert "char_end" in exp["source_span"], exp


if __name__ == "__main__":
    test_every_extracted_skill_resolves_to_a_stored_span()
    test_unsupported_field_stays_unknown()
    test_extract_experience_carries_source_span()
    print("PASS test_resume_extractor: skills resolve to spans; unsupported fields stay unknown")
