# 2026-11-13 — Chat approvals on the low-risk allow-list (task 14.12)

## Goal

Restrict WhatsApp chat approvals to the low-risk allow-list. High-risk actions route to the web surface for manual approval instead of completing in chat.

## What changed

- Created `nova/services/whatsapp-adapter/src/webhook-handlers.ts`:
  - `LOW_RISK_ACTIONS`: allow-list with `read_receipt`, `mark_read`, `typing_on`, `typing_off` (read-only actions only).
  - `extractCallbackData(message)`: reads the callback button action from `callback_data` or from `messages[0].interactive.button_reply.id`.
  - `isLowRiskAction(action)`: allow-list membership check.
  - `classifyChatApproval(message)`: returns `{ allowed, action, routeToWeb, reason }`. Non-callbacks pass through. Low-risk callbacks are allowed. High-risk callbacks set `routeToWeb: true` with a "manual approval required on the web surface" reason.
- Modified `nova/services/whatsapp-adapter/src/webhook.route.ts`:
  - `POST /webhooks/whatsapp` checks `classifyChatApproval(body)` after replay protection and before forwarding to the inbox service. High-risk callbacks return `{ ok: true, routedToWeb: true, action, reason }` without forwarding. Fixed `extractMessageId` and `extractTimestampMs` to read `entry[0].changes[0].value.messages`, which the previous code skipped.
- Added tests:
  - `nova/services/whatsapp-adapter/src/webhook-handlers.test.ts`: allow-list membership, action extraction (both shapes), and classification for low-risk, high-risk, and non-callback messages.
  - `nova/services/whatsapp-adapter/src/webhook.route.test.ts`: high-risk callback routes to web; low-risk callback passes through.

## Design decisions

- Allow-list logic lives in a separate module (`webhook-handlers.ts`) so it stays pure, under 200 lines, and testable without the NestJS route.
- High-risk callbacks return 2xx with a `routedToWeb` flag so Meta sees the webhook as received; no retry storm, and the response states that manual approval is needed on the web surface.
- Channels stay adapters with no extra permissions (Spec:760); phone possession is not treated as account proof (Spec:774).

## Verification

- `tsc --noEmit` passes with `strict` enabled; no `any` types; explicit types throughout.
- `npm run build` passes.
- `npm test`: 44 tests, 41 pass. The 3 failures are pre-existing environmental failures: `forwardToInbox` calls `http://inbox-service:8003`, which is not running in this test environment. All allow-list and routing tests pass.
- All files under 200 lines. Header comments present. ASD-STE100 style used in code comments and this entry.
- No changes to `package.json` or build configuration.
