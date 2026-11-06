/**
 * Nova design system - Employer Registry service.
 * ats_provider resolver (plan task 7, spec:569-575).
 * Classifies a supplied hint (career/board URL) as one of the four
 * permitted official public ATS providers, or "unknown".
 * Discovery is passive: the seed CSV ships empty career_url values and
 * spec:629 forbids guessing domains. Network discovery belongs to the
 * task 8-11 adapters and the task 13 extractor, not here.
 * Security: the hint is parsed with new URL() and the hostname is
 * compared with exact equality. Substring or suffix matching would let
 * a hostile path or hostname (evil.com/boards.greenhouse.io,
 * boards.greenhouse.io.evil.com) route an adapter at a non-permitted
 * host (spec:577 allow-list front door).
 */

// The four permitted official public ATS providers (spec:569).
const ATS_PROVIDERS: readonly string[] = [
  "greenhouse",
  "lever",
  "ashby",
  "smartrecruiters",
];

// A resolved provider, or "unknown" when the hint matches none.
type AtsProvider = "greenhouse" | "lever" | "ashby" | "smartrecruiters" | "unknown";

// Official public board hostnames, exact-match only.
const PROVIDER_HOSTS: Map<string, AtsProvider> = new Map([
  ["boards.greenhouse.io", "greenhouse"],
  ["job-boards.greenhouse.io", "greenhouse"],
  ["jobs.lever.co", "lever"],
  ["jobs.ashbyhq.com", "ashby"],
  ["careers.smartrecruiters.com", "smartrecruiters"],
]);

/**
 * Resolve the ats_provider for a hint string.
 * Returns "unknown" for empty, malformed, non-URL or off-host hints.
 * Never throws: garbage hints are data, not errors.
 */
function resolveAtsProvider(hint: string): AtsProvider {
  const trimmed: string = hint.trim();
  if (trimmed === "") {
    return "unknown";
  }
  // Scheme-less official hosts are still valid hints: prefix https://.
  const candidate: string = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return "unknown";
  }
  const provider: AtsProvider | undefined = PROVIDER_HOSTS.get(url.hostname.toLowerCase());
  if (provider === undefined) {
    return "unknown";
  }
  if (!ATS_PROVIDERS.includes(provider)) {
    return "unknown";
  }
  return provider;
}

export { resolveAtsProvider, type AtsProvider, ATS_PROVIDERS };
