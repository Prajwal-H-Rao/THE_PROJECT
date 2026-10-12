# Module 18 — Release gate

Phase P11. Spec headings: Non-Negotiable Security Invariants (Release Gate), Suggested delivery gates A to G, Evaluation metrics.

## Goal

All ten security invariants pass by test or by an operator-reviewed record. Gates A to G sign in order through a machine-readable state file. No risky feature ships to meet a date.

## The ten invariants (spec:1014-1023, binding)

Spec:1012: "every item below must be demonstrated by automated test or an operator-reviewed test record."

| # | Invariant (spec wording) | Evidence type |
|---|---|---|
| 1 | Agent-exposed operations come from a reviewed, versioned positive allow-list; unsupported tool names and task families fail closed | Registry test plus red-team suite |
| 2 | No general shell, arbitrary code execution, raw SQL, unrestricted browser or fetch, filesystem, secret, Docker or Kubernetes administration tool is exposed to the agent | Tool registry audit test |
| 3 | A jailbreak, indirect injection, tool-output injection or multi-turn expansion cannot add capabilities, change policy, retrieve another user's data, or call outside the allow-list | Red-team suite |
| 4 | Tool use is authorised by server-side identity, resource ownership, integration scope and policy, never by model wording, confidence, `requires_approval` fields or claimed status | Policy tests with a hostile fake model |
| 5 | Consequential side effects require a current, one-time grant bound to action, target, payload hash and user; channel buttons cannot bypass it | Approval race, replay and hash tests |
| 6 | Model and parser workloads have no database access, host filesystem access, shell, secrets, container socket or unrestricted outbound network, verified in Compose and Kubernetes | `17-deployment-hardening` tests |
| 7 | Images run as non-root, are pinned and scanned, have bounded resources and hold no runtime secrets; Kubernetes workloads meet security context, RBAC and NetworkPolicy rules | Image scan plus `USER` check |
| 8 | User-visible completion states map to independently verified evidence; absent or ambiguous evidence reports unverified or unknown with the next safe step | Verifier tests plus UI state tests |
| 9 | Denials and security-relevant failures are audited without retaining private message content, credentials or hidden model reasoning | Audit redaction scan |
| 10 | Tests rerun on any change to model, prompt template, allow-list, tool schema, connector, dependency, base image, Kubernetes policy or deploy config | CI trigger config test |

## Delivery gates A to G

Spec:713 gives the exit criteria. This plan adds a phase and a state file so ordering is testable.

| Gate | Phase | Exit criteria |
|---|---|---|
| A | P1 | Authenticated service boundaries. An unauthenticated private call is rejected. Images run non-root. No secrets in images. |
| B | P3 | Safe parse with provenance. Evidence-bound fields or explicit unknown. Malicious and oversized fixtures fail safely. |
| C | P4 | Approval-and-verification agent lifecycle. No unauthorised write. No fabricated success. |
| D | P6 | One functioning personal workflow. Provider IDs and persisted state verify results. Reminders survive restart without duplicates. |
| E | P8 | Job discovery and drafting with safe human handoff. 250 plus 250 seeds. Source verification gates hold. No site-rule bypass. |
| F | P9 | Telegram and WhatsApp where setup prerequisites permit. Unsigned and replayed webhooks rejected and deduplicated. Every privileged chat action requires a bound approval. |
| G | P11 | Deploy, restore and security regression suite. All ten invariants pass. |

## Build sequence

| # | Task | Artifact | Test | Hrs |
|---|---|---|---|---|
| 1 | Define `gates.json`: gate ID, phase, state `open` or `signed`, signer, timestamp, evidence paths | `docs/release/gates.json` | Schema rejects an unknown field | 4 |
| 2 | Write a gate-ordering check: a gate can sign only when every earlier gate is signed | `tests/release/gates/` | Signing G before A fails | 4 |
| 3 | Map each of the ten invariants to a named test file or a named record path | `tests/release/manifest.json` | An invariant with no path fails the manifest check | 4 |
| 4 | Write invariant 1 and 2 tests with a hostile fake model | release tests | All pass | 6 |
| 5 | Write invariant 3 tests across web, API, channel and worker | release tests | All pass | 6 |
| 6 | Write invariant 4 tests: model wording and `requires_approval` never authorise | release tests | All pass | 5 |
| 7 | Write invariant 5 approval replay, race and escalation tests | release tests | All pass | 6 |
| 8 | Collect invariant 6 evidence from the Compose and Kubernetes isolation suites | release tests | All pass | 4 |
| 9 | Collect invariant 7 image scan and `USER` results | scan record | No critical CVE, non-root confirmed | 4 |
| 10 | Write invariant 8 tests: absent evidence renders unverified, never done | release tests | UI shows `unknown` | 5 |
| 11 | Write invariant 9 audit redaction scan | release tests | Scan is clean | 4 |
| 12 | Write invariant 10 CI trigger test: a prompt or schema change reruns the suite | CI config | A planted change triggers a rerun | 5 |
| 13 | Run the recovery drills: backup restore, export, deletion (spec:711 release gate, not an invariant) | `docs/release/drills.md` | Restore and export pass against a recorded command transcript | 7 |
| 14 | Write the operator checklist with the exact command per record-based invariant | `docs/release/` | Each row names one command and one expected output | 4 |
| 15 | Write the runbook index mapping every alert name to a runbook file | `docs/runbooks/index.md` | A script fails if an alert has no file | 4 |
| 16 | Produce the release report from `gates.json` and `manifest.json` | `docs/release/report.md` | Report is generated, not hand-written | 5 |
| 17 | Schedule a post-release review and a claims-ledger re-check | `changes/` | Re-check dates recorded | 3 |
| 18 | Run the final demo: gates, invariants, metrics and known limits, and record the output | `docs/release/demo.md` | The record names every gate and its state | 4 |
| 19 | Run the threat-model review and record it as a release-gate input | `docs/release/threat-model.md` | Every spec:805 threat maps to a control or a documented gap | 5 |
This build sequence sums to 89 hours.

## Build order

Work these steps in order. A step names tasks from the table above. At 30 hours per week a phase spans several weeks, so a step may run into the next week.

1. Define `gates.json` and the ordering check.
2. Map every invariant to a named test, then write tests 1 to 10.
3. Run the restore and export drills, then generate the release report.

## Acceptance tests

- `test_all_invariants_have_evidence` — `manifest.json` must give every invariant a path, and every path must exist.
- `test_gate_ordering_holds` — signing a later gate while an earlier one is `open` fails.
- `test_no_invariant_disabled_by_config` — removing an invariant entry from `manifest.json` fails the release job.
- `test_release_report_generated` — the report renders from the two JSON files with all ten invariants and all seven gates.
- `test_runbook_index_complete` — every alert name in `infra/alerts/` resolves to a file under `docs/runbooks/`.
- `test_operator_row_names_one_command` — each checklist row parses as one command plus one expected output.

## Rules that bind this gate

- A waiver never authorises access.
- A claims-ledger row marked `stale` blocks its dependent phase.
- A missing test is a failed gate, not a documented risk.
- Spec:711: "Do not launch a risky feature merely to meet the calendar." Defer it with a recorded reason.

## Risks

- Evidence collection is easy to defer. Run the invariant tests from P4, not from P11.
- Record-based invariants invite a vague sign-off. Require the operator to paste the command output into the record.
