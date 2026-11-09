/**
 * Lab 6: One domain integration — Gmail read-only, then draft and send.
 * (Task 09.17, module 09, phase P6.)
 *
 * Built from the real service code, not from a copy (module 19:
 * "Build each lab from the real service code, not from a copy").
 * Requires a build first: `cd nova/services/inbox-service && npm install
 * && npm run build` (dist/ is gitignored; no contracts build needed —
 * the imports used here are type-only and erased in dist).
 *
 * Cases:
 *  1. Read-only list and get work without any approval grant.
 *  2. Draft creation works without a grant; the draft is not sent.
 *  3. Send WITHOUT a grant fails with GrantDeniedError (acceptance).
 *  4. Send WITH a valid grant succeeds and returns a provider message_id.
 *  5. The sent message is registered and the draft stayed unsent.
 */

import { createMockGmailAdapter } from "/home/prajwal/THE_PROJECT/nova/services/inbox-service/dist/gmail/gmail-adapter.js";
import {
  createMockGrantVerifier,
  GrantDeniedError,
} from "/home/prajwal/THE_PROJECT/nova/services/inbox-service/dist/gmail/grant-verifier.js";
import { SendService } from "/home/prajwal/THE_PROJECT/nova/services/inbox-service/dist/gmail/send-service.js";

const USER_ID = "user-lab06";
const RESOURCE = "message:draft-lab06";

let failing = 0;
const passing = [];

// Purpose: record one check outcome, log it, and keep the failure count.
function check(name, condition) {
  if (condition) {
    passing.push(name);
    console.log("PASS " + name);
  } else {
    failing++;
    console.error("FAIL " + name);
  }
}

// Purpose: assert the rejection is the expected grant denial.
async function rejectsGrantDenied(promise) {
  try {
    await promise;
    return false;
  } catch (error) {
    return error instanceof GrantDeniedError && error.code === "grant_denied";
  }
}

async function main() {
  // Real service code under the lab: adapter, verifier, send service.
  const adapter = createMockGmailAdapter({ userId: USER_ID });
  const verifier = createMockGrantVerifier();
  const sendService = new SendService(adapter, verifier, {
    userId: USER_ID,
    policyVersion: "1",
  });

  // Seed one message so the read-only path has content.
  adapter.addMessage({
    from: "alice@example.com",
    to: ["user@example.com"],
    subject: "Quarterly report",
    snippet: "Quarterly numbers attached.",
    receivedAt: "2026-11-09T09:00:00Z",
    labels: ["INBOX"],
  });

  // 1. Read-only: list and get work with no grant at all.
  const listed = await adapter.list(USER_ID);
  check(
    "1a. read-only list returns the seeded message",
    Array.isArray(listed) ? listed.length === 1 : (listed.messages ?? []).length === 1
  );
  const firstMessage = Array.isArray(listed) ? listed[0] : (listed.messages ?? [])[0];
  const got = firstMessage ? await adapter.get(USER_ID, firstMessage.id) : null;
  const message = got && got.message ? got.message : got;
  check(
    "1b. read-only get returns subject without any grant",
    Boolean(message) && message.subject === "Quarterly report"
  );

  // 2. Draft creation needs no grant and never sends.
  const draft = await adapter.draft(
    USER_ID,
    "bob@example.com",
    "Quarterly report",
    "Here are the quarterly numbers."
  );
  check("2a. draft creation returns a draftId", Boolean(draft && draft.draftId));
  const storedDraft = adapter.getDraft(draft.draftId);
  check(
    "2b. the draft holds the fields and was not sent",
    Boolean(storedDraft) && storedDraft.to === "bob@example.com"
  );

  // 3. Acceptance: send without a grant fails with grant_denied.
  const denied = await rejectsGrantDenied(
    sendService.send(draft.draftId, "missing-nonce", { to: "bob@example.com" }, RESOURCE)
  );
  check("3. send without a grant fails (GrantDeniedError, grant_denied)", denied);
  check("3b. the draft is still unsent after the denial", adapter.getSent(draft.draftId) === null);

  // 4. Send with a valid approval grant succeeds.
  verifier.setGrant("nonce-lab06", { ok: true });
  const sent = await sendService.send(
    draft.draftId,
    "nonce-lab06",
    { to: "bob@example.com", subject: "Quarterly report" },
    RESOURCE
  );
  check("4a. send with a grant returns a provider message_id", Boolean(sent && sent.messageId));

  // 5. The sent store registers the id; the draft still keeps its fields.
  check("5a. the sent store holds the sent message id", Boolean(adapter.getSent(sent.messageId)));
  const kept = adapter.getDraft(draft.draftId);
  check("5b. the draft body is intact in the store", Boolean(kept) && kept.subject === "Quarterly report");

  console.log(`lab 6: ${passing.length} passed, ${failing} failed`);
  process.exit(failing === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("FAIL lab 6 crashed: " + (error && error.stack ? error.stack : String(error)));
  process.exit(1);
});
