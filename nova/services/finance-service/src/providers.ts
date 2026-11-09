/**
 * Nova design system - Provider config (task 11.12, module 11).
 * Plaid or India Account Aggregator behind a config flag; flag off means CSV
 * only. Credentials not stored; P9 registry reads only status. Pure stdlib,
 * no pg, no credentials; categorize only, no movement of money.
 */

export interface ProviderAdapter {
  readonly provider: string;
  readonly enabled: boolean;
  readonly status: string; // "connected" | "disabled" | "error"
}

// Purpose: read the PLAID_ENABLED env var (default "0" = off).
function isProviderEnabledEnv(provider: string): boolean {
  if (provider === "plaid") {
    return process.env.PLAID_ENABLED === "1";
  }
  if (provider === "aa") {
    return process.env.AA_ENABLED === "1";
  }
  return false;
}

// Purpose: get the provider adapter for a given provider. Returns null if the
// provider is not enabled (config flag off -> CSV only).
export function getProviderAdapter(provider: string): ProviderAdapter | null {
  if (!isProviderEnabled(provider)) {
    return null;
  }
  return { provider, enabled: true, status: "connected" };
}

// Purpose: check whether a provider is enabled via config flag.
export function isProviderEnabled(provider: string): boolean {
  return isProviderEnabledEnv(provider);
}

// Purpose: reset provider config for testing (clears PLAID_ENABLED/AA_ENABLED).
export function resetProviderConfigForTest(): void {
  delete process.env.PLAID_ENABLED;
  delete process.env.AA_ENABLED;
}
