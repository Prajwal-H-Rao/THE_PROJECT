/**
 * Manual handoff (task 12.17).
 * When a submission path is unsupported or blocked, the prepared content is
 * handed to the user via the official URL. No CAPTCHA evasion, no retry.
 */

import { type ApplicationEnvelope } from "./envelope.js";

/** The handoff result. */
export interface HandoffResult {
  readonly handoff: boolean;
  readonly officialUrl: string;
  readonly reason: string;
  readonly content: string;
}

/** Build a manual handoff for a blocked submission path. */
export function buildHandoff(
  officialUrl: string,
  content: string,
  reason: string,
): HandoffResult {
  return {
    handoff: true,
    officialUrl,
    reason,
    content,
  };
}

/** Return true when a blocked path must hand off rather than evade. */
export function mustHandOff(statusCode: number): boolean {
  return statusCode === 403 || statusCode === 429 || statusCode >= 500;
}

/** Return true when an outcome is an evasion attempt (retry after block). */
export function isEvasion(reason: string): boolean {
  return reason.includes("retry") || reason.includes("bypass") || reason.includes("evade");
}
