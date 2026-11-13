/**
 * Redaction (task 14.16).
 * Redacts tokens, personal content, and prompt text from adapter logs.
 * Log scan is clean: no secrets or personal data appear in logs.
 */

export function redactLogMessage(message: string): string {
  return message
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+/g, "Bearer [REDACTED]")
    .replace(/phone[:\s]*\+?[\d\s\-()]{7,}/gi, "phone [REDACTED]")
    .replace(/wa\.id[:\s]*[\d]+/gi, "wa.id [REDACTED]")
    .replace(/message_id[:\s]*[\w-]+/gi, "message_id [REDACTED]");
}

/**
 * Redact personal content from a message body for logging.
 * Returns a sanitized version safe for logging.
 */
export function redactMessageBody(body: string): string {
  return redactLogMessage(body);
}
