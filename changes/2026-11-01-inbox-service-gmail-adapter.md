# 2026-11-01 inbox-service-gmail-adapter

## Summary
Module 09 (Inbox and Calendar) tasks 1-4: GmailAdapter interface, mock transport, idempotency store, polling worker with delta sync page tokens, draft/send behind approval grant, durable idempotent mail processing.

## Changes
- `nova/services/inbox-service/package.json` — service scaffold (@nestjs/core, @nestjs/common, @nestjs/platform-fastify, pg, reflect-metadata, @nova/contracts)
- `nova/services/inbox-service/nest-cli.json` — NestJS CLI config
- `nova/services/inbox-service/tsconfig.json` — TypeScript config (NodeNext, strict)
- `nova/services/inbox-service/src/gmail/gmail-adapter.ts` — GmailAdapter interface (list with pageToken, get, search, draft, send), GmailMessage/DraftData/DraftResult/SendResult types, mock transport with pageToken paging, draft/send, addMessage test helper, getDraft/getSent test helpers
- `nova/services/inbox-service/src/gmail/idempotency.ts` — IdempotencyStore with read-only isProcessed() pre-check cache + record() after DB insert, key format gmail:{messageId}
- `nova/services/inbox-service/src/gmail/backoff.ts` — computeBackoff, isRateLimited, sleep
- `nova/services/inbox-service/src/gmail/delta-sync.ts` — DeltaSyncCursorStore for per-user poll cursors
- `nova/services/inbox-service/src/gmail/message-repository.ts` — MessageRepository with SQL INSERT ... ON CONFLICT (user_id, message_id) DO NOTHING as sole authoritative claim gate
- `nova/services/inbox-service/src/gmail/polling-worker.ts` — PollingWorker with setInterval cadence, page chaining, backoff retry, idempotent processing via MessageRepository insertMessage() as claim gate
- `nova/services/inbox-service/src/gmail/grant-verifier.ts` — GrantVerifier interface, GrantVerificationError, GrantNotFoundError, GrantDeniedError, MockGrantVerifier, createMockGrantVerifier
- `nova/services/inbox-service/src/gmail/draft-service.ts` — DraftService: stores draft data, returns draft_id, does NOT send (separation from send)
- `nova/services/inbox-service/src/gmail/send-service.ts` — SendService: verifies grant nonce via GrantVerifier before sending, returns provider message_id, rejects without valid grant
- `nova/services/inbox-service/src/gmail/gmail-adapter.test.ts` — 9 contract tests (list, get, search, pageToken paging, draft, send)
- `nova/services/inbox-service/src/gmail/backoff.test.ts` — 4 backoff tests
- `nova/services/inbox-service/src/gmail/delta-sync.test.ts` — 4 cursor store tests
- `nova/services/inbox-service/src/gmail/polling-worker.test.ts` — 4 worker tests (idempotent processing, page chaining, backoff retry, ON CONFLICT skip)
- `nova/services/inbox-service/src/gmail/message-repository.test.ts` — 3 repository tests (new message, duplicate message, alternating claims)
- `nova/services/inbox-service/src/gmail/draft-service.test.ts` — 2 draft tests (creates draft, does not send)
- `nova/services/inbox-service/src/gmail/send-service.test.ts` — 4 send tests (valid grant, rejected without grant, unknown nonce, invalid draft)
- `nova/services/inbox-service/src/app.module.ts` — NestJS AppModule wiring GMAIL_ADAPTER, IdempotencyStore, MessageRepository, PG_POOL, PollingWorker
- `nova/services/inbox-service/src/main.ts` — NestJS Fastify entry point, starts PollingWorker after bootstrap
- `repo.md` — updated Module 09 tasks 1-4 status

## Tests
30/30 tests pass across 7 test suites. TypeScript compiles cleanly (strict mode).

## Notes
No real Gmail OAuth (credentials barred from source). No compose registration (scaffolding only). Uses GrantVerificationClient from contracts for real HTTP grant verification (tests use MockGrantVerifier). Nonce format: 32-char hex. draft/send separation enforced: draft only stores, send requires grant verification. Provider message_id from adapter on send. Durable dedup via SQL ON CONFLICT on migration 05 UNIQUE(user_id, message_id). claimAndRecord replaced with read-only isProcessed() + record() after DB insert to avoid double-claim. Files under 200 lines with header comments. ASD-STE100 language in all comments.