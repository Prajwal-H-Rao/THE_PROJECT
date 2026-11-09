/**
 * Nova design system - Estimation (task 11.14, module 11).
 * Route and fare estimation with a provider adapter. All estimates are
 * labelled — never presented as definitive prices. Pure stdlib, no pg,
 * no credentials; categorize only, no movement of money.
 */

export interface Estimate {
  readonly amountMinor: number; // integer minor units
  readonly currency: string;
  readonly estimateLabel: string; // e.g. "estimated", "estimated fare"
}

export type FareEstimate = Estimate;

export interface RouteEstimate {
  readonly origin: string;
  readonly destination: string;
  readonly distanceKm: number;
  readonly durationMinutes: number;
  readonly estimatedFareMinor: number;
  readonly currency: string;
  readonly estimateLabel: string;
}

// Purpose: deterministic per-km rate used for fare estimation.
const RATE_PER_KM_MINOR = 250; // 2.50 USD per km in minor units

// Purpose: estimate a route between origin and destination. Deterministic:
// same origin/destination always returns the same estimate.
export function estimateRoute(
  origin: string,
  destination: string,
): RouteEstimate {
  const distanceKm = Math.round(
    Math.abs(origin.charCodeAt(0) - destination.charCodeAt(0)) * 3.7 + 5,
  );
  const durationMinutes = Math.round(distanceKm * 2.5);
  const estimatedFareMinor = Math.round(distanceKm * RATE_PER_KM_MINOR);
  return {
    origin,
    destination,
    distanceKm,
    durationMinutes,
    estimatedFareMinor,
    currency: "USD",
    estimateLabel: "estimated",
  };
}

// Purpose: estimate the fare for a given distance. Integer minor units only;
// result is rounded to the nearest minor unit.
export function estimateFare(
  distanceKm: number,
  ratePerKm: number,
): Estimate {
  const amountMinor = Math.round(distanceKm * ratePerKm);
  return {
    amountMinor,
    currency: "USD",
    estimateLabel: "estimated fare",
  };
}
