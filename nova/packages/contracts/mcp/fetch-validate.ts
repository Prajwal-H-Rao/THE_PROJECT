/**
 * Fetch tool URL allow-list validation (task 21.9).
 * Validates that a URL's hostname is within the provider_allowlist.
 * No arbitrary URL fetching is permitted (spec:149, spec:503).
 */

import { URL } from "node:url";

/**
 * Validation result for a fetch URL against a provider allow-list.
 */
export interface FetchURLValidationResult {
  readonly ok: boolean;
  readonly reason?: string;
}

/**
 * Validate that a URL's hostname is within the provider allow-list.
 * Matches exact hostnames and subdomains (e.g. "api.example.com" matches
 * allow-listed "example.com"). Returns { ok: true } when allowed,
 * { ok: false, reason } when refused.
 */
export function validateFetchURL(
  url: string,
  providerAllowlist: readonly string[],
): FetchURLValidationResult {
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  const hostname = urlObj.hostname;

  const isAllowed = providerAllowlist.some((domain) => {
    if (hostname === domain) {
      return true;
    }
    // Subdomain match: "api.example.com" matches allow-listed "example.com"
    return hostname.endsWith("." + domain);
  });

  if (!isAllowed) {
    return { ok: false, reason: "url_not_in_allowlist" };
  }

  return { ok: true };
}
