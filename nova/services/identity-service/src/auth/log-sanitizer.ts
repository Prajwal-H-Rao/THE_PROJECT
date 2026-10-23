/** Log sanitization service to prevent secrets in logs. */

const SECRET_PATTERNS = [
  // JWT tokens
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  // API keys (common patterns)
  /[a-zA-Z0-9_-]{20,}/g,
  // Bearer tokens
  /Bearer\s+[A-Za-z0-9_\-\.]+/gi,
  // Password fields
  /"password"\s*:\s*"[^"]*"/gi,
  /"password_hash"\s*:\s*"[^"]*"/gi,
  /"secret"\s*:\s*"[^"]*"/gi,
  /"api_key"\s*:\s*"[^"]*"/gi,
  /"access_token"\s*:\s*"[^"]*"/gi,
  /"refresh_token"\s*:\s*"[^"]*"/gi,
  /"client_secret"\s*:\s*"[^"]*"/gi,
  /"private_key"\s*:\s*"[^"]*"/gi,
  // Credit card numbers
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  // SSN
  /\b\d{3}-\d{2}-\d{4}\b/g,
  // API keys with prefixes
  /(sk|pk|rk)_[a-zA-Z0-9]{20,}/g,
  // AWS keys
  /AKIA[0-9A-Z]{16}/g,
  // GitHub tokens
  /gh[pousr]_[A-Za-z0-9_]{36,}/g,
  // Slack tokens
  /xox[baprs]-[A-Za-z0-9-]{10,}/g,
];

/** Sanitize an object by removing or masking sensitive fields. */
export function sanitizeForLogging(obj: unknown, customPatterns: RegExp[] = []): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return sanitizeString(obj, customPatterns);
  if (Array.isArray(obj)) return obj.map(item => sanitizeForLogging(item, customPatterns));
  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (isSensitiveKey(lowerKey)) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeForLogging(value, customPatterns);
      }
    }
    return sanitized;
  }
  return obj;
}

/** Sanitize a string by replacing secret patterns. */
function sanitizeString(str: string, customPatterns: RegExp[] = []): string {
  let result = str;
  const allPatterns = [...SECRET_PATTERNS, ...customPatterns];
  for (const pattern of allPatterns) {
    result = result.replace(pattern, "[REDACTED]");
  }
  return result;
}

/** Check if a key name indicates sensitive data. */
function isSensitiveKey(key: string): boolean {
  const sensitiveKeys = [
    "password",
    "password_hash",
    "secret",
    "secret_key",
    "api_key",
    "access_token",
    "refresh_token",
    "client_secret",
    "private_key",
    "privatekey",
    "apikey",
    "token",
    "bearer",
    "authorization",
    "cookie",
    "session",
    "csrf",
    "totp",
    "otp",
    "pin",
    "ssn",
    "credit_card",
    "creditcard",
    "cvv",
    "cvc",
  ];
  return sensitiveKeys.some(key => key.toLowerCase().includes(key.toLowerCase()));
}

/** Create a sanitizing logger wrapper. */
export function createSanitizingLogger<T extends Record<string, (...args: unknown[]) => void>>(
  logger: T
): T {
  const sanitized: Record<string, (...args: unknown[]) => void> = {};
  for (const key of Object.keys(logger)) {
    const fn = logger[key];
    if (typeof fn === "function") {
      (sanitized as any)[key] = (...args: unknown[]) => fn(...args.map((arg: unknown) => sanitizeForLogging(arg)));
    }
  }
  return sanitized as T;
}

/** Middleware to sanitize request/response bodies in logs. */
export function createLogSanitizationMiddleware() {
  return (req: any, res: any, next: () => void) => {
    const originalLog = console.log;
    console.log = (...args: unknown[]) => originalLog(...args.map(arg => sanitizeForLogging(arg)));
    next();
  };
}