/**
 * Inbound sanitiser (task 14.9).
 * Sanitizes untrusted inbound text from WhatsApp messages to prevent injection
 * attacks and cross-site scripting. All user-provided text is treated as
 * untrusted content.
 */

export interface SanitisedText {
  readonly text: string;
  readonly wasRedacted: boolean;
}

/** HTML entity map for escaping HTML special characters. */
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

/** Escape HTML special characters in text. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"'/`=]/g, (char) => HTML_ENTITIES[char] ?? char);
}

/** Common XSS and injection patterns to redact. */
const SUSPICIOUS_PATTERNS: ReadonlyArray<RegExp> = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
  /<input\b[^>]*>/gi,
  /<textarea\b[^<]*(?:(?!<\/textarea>)<[^<]*)*<\/textarea>/gi,
  /<select\b[^<]*(?:(?!<\/select>)<[^<]*)*<\/select>/gi,
  /<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi,
  /<img\b[^>]*>/gi,
  /<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:/gi,
  /on\w+\s*=/gi,
];

/** Sanitize inbound text for safe display. Removes scripts, event handlers,
 * dangerous protocols, and escapes HTML. Returns the sanitized text and
 * whether any redaction occurred. */
export function sanitiseText(text: string): SanitisedText {
  let sanitized = text;
  let wasRedacted = false;

  // Remove script tags and their content
  const scriptPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
  if (scriptPattern.test(sanitized)) {
    sanitized = sanitized.replace(scriptPattern, "[REDACTED]");
    wasRedacted = true;
  }

  // Remove iframe tags
  const iframePattern = /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi;
  if (iframePattern.test(sanitized)) {
    sanitized = sanitized.replace(iframePattern, "[REDACTED]");
    wasRedacted = true;
  }

  // Remove object/embed tags
  const objectPattern = /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi;
  if (objectPattern.test(sanitized)) {
    sanitized = sanitized.replace(objectPattern, "[REDACTED]");
    wasRedacted = true;
  }

  // Remove dangerous URL schemes
  const dangerousPattern = /(javascript|vbscript|data|file):/gi;
  if (dangerousPattern.test(sanitized)) {
    sanitized = sanitized.replace(dangerousPattern, "[REDACTED]:");
    wasRedacted = true;
  }

  // Remove event handler attributes (onclick=, onload=, etc.)
  const eventHandlerPattern = /on\w+\s*=\s*["'][^"']*["']/gi;
  if (eventHandlerPattern.test(sanitized)) {
    sanitized = sanitized.replace(eventHandlerPattern, "");
    wasRedacted = true;
  }

  // Escape remaining HTML
  const escaped = escapeHtml(sanitized);
  if (escaped !== sanitized) {
    wasRedacted = true;
  }

  return { text: escaped, wasRedacted };
}

/**
 * Sanitize a WhatsApp message body for safe display. Returns the sanitized
 * text and whether any redaction occurred.
 */
export function sanitiseMessageBody(text: string): SanitisedText {
  return sanitiseText(text);
}
