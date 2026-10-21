# Module 08 — Policy and approval engine

Phase P2. Spec headings: Agent workflow and execution policy (policy half), Chat-based approvals, UI states for agent work (approval half).

## Goal

Policy is server code. An approval is a one-time grant bound to the exact action, target, user, payload hash, expiry and nonce. Chat buttons cannot widen it.

## Constraints (spec, binding)

Each bullet names the spec line it quotes. Quote marks mean verbatim text.

- Spec:21: "Approval is a backend policy decision, not a prompt instruction."
- Spec:21: "All sensitive actions default to review: send message/email, create/change calendar events that invite others, submit application, connect/revoke account, bulk edits, and any financial or irreversible operation."
- Spec:170: "Read-only operations can be allowed inside the current user's scopes."
- Spec:774: "A chat callback may be used only if the user identity is already bound, the action preview is immutable, the approval is bound to the payload hash, nonce and expiry, and the provider callback can be verified."
- Spec:774: "Never treat free-form text such as “yes” as approval for an ambiguous or changed action."
- Spec:774: "No approval should grant a broader persistent permission than the exact action requested."

## Build sequence

| # | Task | Artifact | Test | Hrs |
|---|---|---|---|---|
| 1 | Define the policy rule schema: actor, scope, sensitivity, target, blast radius, risk tier | policy service | Unknown field fails | 5 |
| 2 | Encode per-action default policies for all 7 task families | `families.yaml` | Every family in `families.yaml` has a default rule, and a family with no rule fails validation | 6 |
| 3 | Implement the decision endpoint returning `allow`, `deny` or `needs_approval` | policy service | Decision is deterministic for the same input | 6 |
| 4 | Create the approval record bound to payload hash, user, target, expiry and nonce | policy schema | Any byte change invalidates it | 7 |
| 5 | Implement single-use consumption with a race test | policy service | Two concurrent approvals, one wins | 6 |
| 6 | Implement expiry and revocation | policy service | An expired or revoked grant fails the policy check. The domain services prove the same rule in P6 and P8 | 5 |
| 7 | Build the grant-verification helper that domain services call. The inbox, calendar and job services consume it in P6 and P8. | policy service | A grant issued for another service fails | 7 |
| 8 | Build the approval card API: target, data preview, permissions, consequence, expiry, hash. `09-inbox-calendar` and `12-jobs-agent` verify the live match in P6 and P8. | policy service | The card hash binds the preview, and a preview edited after hashing fails | 5 |
| 9 | Support approve, reject, edit and expire outcomes | policy service | Edit re-hashes and re-routes to policy | 6 |
| 10 | Implement the chat-approval policy: low-risk allow-list, payload binding, expiry and nonce checks | policy service | A high-risk payload is refused by the policy service with no channel involved | 5 |
| 11 | Reject free-text approval at the policy boundary | policy service | A payload that carries free text instead of a bound action ID is refused | 4 |
| 12 | Audit every allow and deny with policy version and correlation ID | audit service | Both outcomes recorded | 4 |
| 13 | Add policy version to every decision and pin it in the grant | policy schema | A policy change invalidates old grants | 4 |
| 14 | Implement bulk-action policy: no silent enable of new sources or applications | policy service | Batch test fails on escalation | 4 |
| 15 | Add approval wait and expiry metrics | observability | Metric renders | 3 |

This build sequence sums to 77 hours.

## Build order

Work these steps in order. A step names tasks from the table above. At 40 hours per week a phase spans several weeks, so a step may run into the next week.

1. Define the policy rule schema and encode the family defaults.
2. Create the approval grant with payload-hash binding.
3. Add single-use consumption and the race test.

## Acceptance tests

- `test_replayed_approval_denied` — the policy allows one consumption of a grant and rejects the second.
- `test_expired_approval_denied` — the policy check rejects a grant past its expiry. `09-inbox-calendar` repeats the check at the executing service in P6.
- `test_cross_user_approval_denied` — a grant for user A fails for user B.
- `test_altered_payload_invalidates_approval` — one changed byte invalidates the grant.
- `test_policy_change_invalidates_grant` — a version bump invalidates old grants.
- `test_free_text_not_approval` — "yes" to an ambiguous action fails.
- `test_bulk_action_cannot_enable_source` — a batch cannot add a new source or submit an application.
- `test_preview_matches_execution` — the card hash binds the previewed payload, so any later edit fails the hash check. `12-jobs-agent` repeats the check against a live submission in P8.

## Risks

- A race on single-use consumption is the classic failure. Test it with two concurrent requests, not sequentially.
- Policy version pinning means every policy edit expires outstanding approvals. That is correct. Tell the user in the UI.
- Chat approvals are convenient and risky. Keep them to notification plus a small allow-list until P9 proves the callback signature.
