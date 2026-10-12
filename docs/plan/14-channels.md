# Module 14 — WhatsApp and Telegram channels

Phase P9. Spec headings: WhatsApp and Telegram Interaction, Telegram, WhatsApp Business Platform / Cloud API, Chat-based approvals.

## Goal

Two channels carry reading, notifications, confirmations and low-risk approvals. Each channel verifies a signature, rejects replays, and deduplicates every inbound message.

## Constraints (spec, binding)

- Spec:756: "Treat each messaging service as a **channel adapter**, not as identity authority. Channels are optional views into the same policy-controlled agent; they do not receive extra permissions because a message arrives from a phone."
- Spec:760: configure "a high-entropy `secret_token`" and "Validate the `X-Telegram-Bot-Api-Secret-Token` header and accept only expected update types."
- Spec:761: "Record Telegram `update_id` and message/callback identifiers for deduplication. Return promptly after durable queueing."
- Spec:762: "Never bind a Telegram numeric ID to a NOVA account merely because it states an email or username."
- Spec:763: "Outbound callbacks/buttons are untrusted requests; verify actor, action ID, expiry, nonce and exact action hash server-side."
- Spec:768: "verify webhook authenticity using the provider's currently documented signature procedure over the raw request body and the configured app secret, using constant-time comparison."
- Spec:769: "Deduplicate inbound message IDs and status events; process retries idempotently; enforce per-user/provider rate limits, opt-in/consent and outbound message policies."
- Spec:770: "Phone possession is not proof of NOVA account ownership on its own."
- Claim C12: WhatsApp signature is `X-Hub-Signature-256`, HMAC-SHA256 over the raw body, `sha256=` prefix.

## Build sequence

| # | Task | Artifact | Test | Hrs |
|---|---|---|---|---|
| 1 | Implement WhatsApp signature verification over the raw body with constant-time compare | `services/whatsapp-adapter/` | Truncated and mutated bodies fail | 7 |
| 2 | Implement `GET /webhooks/whatsapp` verify-token challenge | adapter | Wrong challenge fails | 3 |
| 3 | Implement message-ID idempotency with a dedup store | adapter | Duplicate delivery is a no-op | 5 |
| 4 | Add replay protection: timestamp window plus nonce store | adapter | An old signed message fails | 5 |
| 5 | Build the outbound sender with per-user rate limits and opt-in state | adapter | Opt-out stops delivery | 5 |
| 6 | Implement Telegram secret-token header check | `telegram/` | Wrong token returns 403 | 3 |
| 7 | Implement Telegram update offset handling and delivery retry | telegram | Retry does not double-process | 5 |
| 8 | Create the Telegram bot, set a high-entropy `secret_token`, and configure HTTPS webhook delivery | bot config plus `setWebhook` | A request without the secret header returns 403 | 4 |
| 9 | Build the inbound sanitiser that treats text as untrusted data | adapters | Injection in inbound text cannot change policy | 5 |
| 10 | Implement the action preview card for chat approvals | adapter + policy | Preview hash matches the grant | 6 |
| 11 | Implement inline button callbacks with signature or secret verification | adapter | Callback for another user fails | 6 |
| 12 | Restrict chat approvals to the low-risk allow-list | policy | High risk routes to the web surface | 4 |
| 13 | Reject free-text approvals | adapter | "yes" to an ambiguous action fails | 4 |
| 14 | Add notification templates: reminder, approval request, digest, job alert | notification service | Templates render with no secret material | 5 |
| 15 | Implement delivery receipts and failure handling with backoff | notification service | Failure is audited, not silent | 5 |
| 16 | Add redaction: no tokens, personal content or prompt text in logs | adapters + tests | Log scan is clean | 4 |
| 17 | Consume the P2 single-use linking nonce in the channel account-linking flow | identity + adapters | A channel-stated email cannot bind without redeeming a P2 nonce | 6 |
| 18 | Add webhook and delivery metrics | observability | Dedup and failure rates render | 4 |
| 19 | Build the channel settings page: link, unlink, mute, opt-out | web UI | Playwright flow passes | 5 |
| 20 | Deliver curriculum lab 5: Telegram webhook locally, WhatsApp behind a flag | `labs/lab05/` | Signature and dedup tests pass | 5 |
This build sequence sums to 96 hours.

## Acceptance tests

- `test_unsigned_whatsapp_rejected` — no signature returns 401.
- `test_mutated_body_fails_signature` — one changed byte fails.
- `test_replayed_whatsapp_rejected` — an old valid message fails the window check.
- `test_duplicate_delivery_noop` — the same message ID processes once.
- `test_wrong_telegram_secret_rejected` — 403.
- `test_callback_bound_to_payload_hash` — a callback for a different payload fails.
- `test_cross_user_callback_rejected` — user A's button cannot approve user B.
- `test_free_text_not_approval` — free text never approves a consequential action.
- `test_high_risk_routes_to_web` — a consequential action never completes in chat alone.
- `test_no_token_in_logs` — the log scan is clean.

## External gates

Meta business verification and WABA setup carry weeks of lead time (see `schedule.md`). Telegram bot token takes minutes. Ship Telegram first and mark WhatsApp `blocked-by-claim` until verification clears.

## Risks

- Verifying the signature proves the sender, not the intent. Every message stays untrusted input after verification.
- Telegram retries non-2xx deliveries. A slow handler plus a retry equals duplicates. Idempotency is mandatory.
- Chat approvals are the highest-risk convenience in the whole plan. Keep the allow-list narrow and expand it only with test evidence.
