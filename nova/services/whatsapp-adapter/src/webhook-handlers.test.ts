/**
 * Tests for the chat approval allow-list (task 14.12).
 * Verifies low-risk actions pass, high-risk actions route to web,
 * and non-callback messages pass through.
 */

import * as assert from "node:assert";
import { test } from "node:test";
import {
  ChatApprovalDecision,
  classifyChatApproval,
  extractCallbackData,
  isLowRiskAction,
  LOW_RISK_ACTIONS,
} from "./webhook-handlers.js";

test("LOW_RISK_ACTIONS contains exactly the four read-only actions", () => {
  assert.equal(LOW_RISK_ACTIONS.size, 4);
  assert.ok(LOW_RISK_ACTIONS.has("read_receipt"));
  assert.ok(LOW_RISK_ACTIONS.has("mark_read"));
  assert.ok(LOW_RISK_ACTIONS.has("typing_on"));
  assert.ok(LOW_RISK_ACTIONS.has("typing_off"));
});

test("isLowRiskAction returns true for allow-listed actions", () => {
  for (const action of ["read_receipt", "mark_read", "typing_on", "typing_off"]) {
    assert.equal(isLowRiskAction(action), true);
  }
});

test("isLowRiskAction returns false for high-risk actions", () => {
  for (const action of [
    "send_message",
    "delete_account",
    "make_payment",
    "approve_loan",
    "change_password",
  ]) {
    assert.equal(isLowRiskAction(action), false);
  }
});

test("extractCallbackData reads button_reply.id from an interactive message", () => {
  const message = {
    messages: [
      {
        interactive: {
          type: "button_reply",
          button_reply: { id: "read_receipt", title: "Mark read" },
        },
      },
    ],
  };
  assert.equal(extractCallbackData(message), "read_receipt");
});

test("extractCallbackData reads a top-level callback_data field", () => {
  const message = { callback_data: "mark_read" };
  assert.equal(extractCallbackData(message), "mark_read");
});

test("extractCallbackData reads button_reply.id from a full webhook body", () => {
  const body = {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  id: "msg-1",
                  interactive: { button_reply: { id: "typing_off" } },
                },
              ],
            },
          },
        ],
      },
    ],
  };
  assert.equal(extractCallbackData(body), "typing_off");
});

test("extractCallbackData returns undefined for a plain text message", () => {
  const message = { messages: [{ type: "text", text: { body: "hello" } }] };
  assert.equal(extractCallbackData(message), undefined);
  assert.equal(extractCallbackData(null), undefined);
  assert.equal(extractCallbackData(undefined), undefined);
  assert.equal(extractCallbackData("not an object"), undefined);
});

test("classifyChatApproval allows a low-risk callback", () => {
  const message = {
    messages: [
      { interactive: { button_reply: { id: "typing_on" } } },
    ],
  };
  const decision: ChatApprovalDecision = classifyChatApproval(message);
  assert.equal(decision.allowed, true);
  assert.equal(decision.action, "typing_on");
  assert.equal(decision.routeToWeb, false);
  assert.ok(decision.reason.includes("allow-list"));
});

test("classifyChatApproval routes a high-risk callback to the web", () => {
  const message = {
    messages: [
      { interactive: { button_reply: { id: "delete_account" } } },
    ],
  };
  const decision: ChatApprovalDecision = classifyChatApproval(message);
  assert.equal(decision.allowed, false);
  assert.equal(decision.action, "delete_account");
  assert.equal(decision.routeToWeb, true);
  assert.ok(decision.reason.includes("manual approval"));
  assert.ok(decision.reason.includes("web surface"));
});

test("classifyChatApproval passes through a non-callback message", () => {
  const message = { messages: [{ type: "text", text: { body: "yes" } }] };
  const decision: ChatApprovalDecision = classifyChatApproval(message);
  assert.equal(decision.allowed, true);
  assert.equal(decision.action, undefined);
  assert.equal(decision.routeToWeb, false);
});
