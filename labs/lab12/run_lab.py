#!/usr/bin/env python3
"""
Lab 12: 500-employer directory import and pilot verification.

Imports NOVA_Employer_Targets_500.csv and asserts:
  - Exactly 500 rows with 11-column header
  - Exactly 250 IN and 250 GLOBAL
  - Unique normalized_name values
  - All registry_status = needs_verification (targets only)
  - All career_url values are empty (not yet verified)
Then marks 10 pilot employers as verified.

Run: python labs/lab12/run_lab.py
"""

import csv
import sys
from pathlib import Path


CSV_PATH = Path(__file__).resolve().parent.parent.parent / "NOVA_Employer_Targets_500.csv"
EXPECTED_HEADER = [
    "target_id",
    "region",
    "company_name",
    "normalized_name",
    "registry_status",
    "user_priority",
    "career_url",
    "source_mode",
    "ats_provider",
    "source_evidence_url",
    "source_verified_at",
]
PILOT_COUNT = 10


def load_csv(path: Path) -> list[dict]:
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        header = reader.fieldnames
        if header != EXPECTED_HEADER:
            print(f"FAIL: header mismatch. Got {header}, expected {EXPECTED_HEADER}")
            return []
        return list(reader)


def assert_counts(rows: list[dict]) -> bool:
    all_passed = True

    if len(rows) != 500:
        print(f"FAIL: expected 500 rows, got {len(rows)}")
        all_passed = False

    in_count = sum(1 for r in rows if r["region"] == "IN")
    global_count = sum(1 for r in rows if r["region"] == "GLOBAL")
    if in_count != 250:
        print(f"FAIL: expected 250 IN rows, got {in_count}")
        all_passed = False
    if global_count != 250:
        print(f"FAIL: expected 250 GLOBAL rows, got {global_count}")
        all_passed = False

    names = [r["normalized_name"] for r in rows]
    if len(names) != len(set(names)):
        print("FAIL: duplicate normalized_name values found")
        all_passed = False

    statuses = set(r["registry_status"] for r in rows)
    if statuses != {"needs_verification"}:
        print(f"FAIL: expected all needs_verification, got {statuses}")
        all_passed = False

    urls = [r["career_url"] for r in rows]
    if any(u != "" for u in urls):
        print("FAIL: expected all career_url empty, got populated values")
        all_passed = False

    if all_passed:
        print("PASS: 500-row seed import assertion (250 IN + 250 GLOBAL, unique names, all needs_verification, career_url null)")

    return all_passed


def mark_pilots_verified(rows: list[dict], count: int = PILOT_COUNT) -> list[dict]:
    """Mark the first N employers as verified pilots."""
    pilots = []
    for row in rows[:count]:
        pilot = dict(row)
        pilot["registry_status"] = "identity_verified"
        pilot["source_verified_at"] = "2026-11-13T00:00:00Z"
        pilots.append(pilot)
    return pilots


def main() -> bool:
    print("Lab 12: 500-employer directory import and pilot verification")
    print("=" * 60)

    rows = load_csv(CSV_PATH)
    if not rows:
        return False

    all_passed = assert_counts(rows)

    pilots = mark_pilots_verified(rows, PILOT_COUNT)
    print(f"PASS: {PILOT_COUNT} pilot employers marked verified (identity_verified)")
    for p in pilots[:3]:
        print(f"  - {p['company_name']} ({p['region']})")
    if len(pilots) > 3:
        print(f"  ... and {len(pilots) - 3} more")

    print("")
    if all_passed:
        print("Lab 12: All seed import assertions passed.")
    else:
        print("Lab 12: Some assertions FAILED.")
    return all_passed


success = main()
sys.exit(0 if success else 1)
