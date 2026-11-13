/**
 * Chat approval allow-list for WhatsApp button callbacks (task 14.12).
 * Only low-risk read-only actions may be approved via chat.
 * High-risk actions route to the web surface for manual approval.
 * Spec:760 - channels are adapters, not identity authority, and receive no extra permissions.
 * Spec:774 - phone possession is not proof of NOVA account ownership.
 */

export const LOW_RISK_ACTIONS: ReadonlySet<string> = new Set([
  "read_receipt",
  "mark_read",
  "typing_on",
  "typing_off",
]);

export interface ChatApprovalDecision {
  /** True when the action may proceed in chat. */
  readonly allowed: boolean;
  /** The callback action extracted from the message, if any. */
  readonly action: string | undefined;
  /** True when the action must be handled on the web surface. */
  readonly routeToWeb: boolean;
  /** Human-readable reason for the decision. */
  readonly reason: string;
}

/**
 * Collect the message array from either a raw message object
 * (top-level messages field) or a full WhatsApp webhook body
 * (entry[0].changes[0].value.messages).
 */
function messageList(obj: Record<string, unknown>): unknown[] | undefined {
  const topLevel = obj["messages"];
  if (Array.isArray(topLevel)) {
    return topLevel;
  }
  const entry = obj["entry"];
  if (Array.isArray(entry) && entry.length > 0) {
    const changes = (entry[0] as Record<string, unknown>)?.["changes"];
    if (Array.isArray(changes) && changes.length > 0) {
      const value = (changes[0] as Record<string, unknown>)?.["value"] as Record<string, unknown>;
      const nested = value["messages"];
      if (Array.isArray(nested)) {
        return nested;
      }
    }
  }
  return undefined;
}

/**
 * Extract the callback button action from a WhatsApp message payload.
 * WhatsApp Cloud API button replies carry the action in
 * messages[0].interactive.button_reply.id.
 * A top-level callback_data field is also accepted.
 */
export function extractCallbackData(message: unknown): string | undefined {
  if (!message || typeof message !== "object") {
    return undefined;
  }
  const obj = message as Record<string, unknown>;

  const topLevel = obj["callback_data"];
  if (typeof topLevel === "string" && topLevel.length > 0) {
    return topLevel;
  }

  const messages = messageList(obj);
  if (messages === undefined || messages.length === 0) {
    return undefined;
  }
  const first = messages[0] as Record<string, unknown>;
  const interactive = first["interactive"];
  if (interactive && typeof interactive === "object") {
    const buttonReply = (interactive as Record<string, unknown>)["button_reply"];
    if (buttonReply && typeof buttonReply === "object") {
      const id = (buttonReply as Record<string, unknown>)["id"];
      if (typeof id === "string" && id.length > 0) {
        return id;
      }
    }
  }

  return undefined;
}

/**
 * Check whether a callback action is on the low-risk allow-list.
 * Only read-only actions are allowed: read_receipt, mark_read, typing_on, typing_off.
 */
export function isLowRiskAction(action: string): boolean {
  return LOW_RISK_ACTIONS.has(action);
}

/**
 * Classify an incoming WhatsApp message for chat approval.
 * Non-callback messages pass through as allowed.
 * Low-risk callbacks are allowed. High-risk callbacks route to the web surface.
 */
export function classifyChatApproval(message: unknown): ChatApprovalDecision {
  const action = extractCallbackData(message);

  if (action === undefined) {
    return {
      allowed: true,
      action: undefined,
      routeToWeb: false,
      reason: "not a callback - pass through",
    };
  }

  if (isLowRiskAction(action)) {
    return {
      allowed: true,
      action,
      routeToWeb: false,
      reason: "low-risk action on allow-list",
    };
  }

  return {
    allowed: false,
    action,
    routeToWeb: true,
    reason: `high-risk action "${action}" is not on the low-risk allow-list - manual approval required on the web surface`,
  };
}
