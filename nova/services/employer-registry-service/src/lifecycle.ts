/**
 * Nova design system - Employer Registry service.
 * Spec:562 registry lifecycle: six pipeline states plus six health states,
 * with legal transitions only.
 * Pipeline is linear, one step forward, no skipping and no backward.
 * A poll outcome sets a health state from polling; recovery returns to
 * polling. source_changed forces re-verification (career_url_verified) —
 * it must never reach polling directly (spec:558 verify before polling).
 * manual_only and paused return to polling only through explicit user
 * action (spec:633 pause/resume control); the task-6 worker gate
 * re-checks source_permission_reviewed before any poll fires.
 */

// The six pipeline states, in forward order (spec:562).
const PIPELINE_STATES: readonly string[] = [
  "seeded",
  "identity_verified",
  "career_url_verified",
  "source_permission_reviewed",
  "connector_configured",
  "polling",
];

// The six health states a poll outcome can set (spec:562).
const HEALTH_STATES: readonly string[] = [
  "healthy",
  "no_openings",
  "source_changed",
  "rate_limited",
  "manual_only",
  "paused",
];

// Legal transition map: current state → allowed target states.
const LEGAL_TRANSITIONS: Map<string, readonly string[]> = new Map();

// Pipeline: exactly one forward step, no skip, no backward.
for (let i = 0; i < PIPELINE_STATES.length - 1; i += 1) {
  const current = PIPELINE_STATES[i];
  const next = PIPELINE_STATES[i + 1];
  if (current === undefined || next === undefined) {
    continue;
  }
  LEGAL_TRANSITIONS.set(current, [next]);
}

// Polling: any poll outcome may set any health state (spec:562).
LEGAL_TRANSITIONS.set("polling", [...HEALTH_STATES]);

// Recovery: a running cycle returns to polling (spec:581 24h cycle).
for (const health of ["healthy", "no_openings", "rate_limited"]) {
  LEGAL_TRANSITIONS.set(health, ["polling"]);
}

// Explicit user action resumes a paused or manual source (spec:633).
LEGAL_TRANSITIONS.set("manual_only", ["polling"]);
LEGAL_TRANSITIONS.set("paused", ["polling"]);

// source_changed forces re-verification before any further poll
// (spec:558: verify the career page and permitted source before polling).
LEGAL_TRANSITIONS.set("source_changed", ["career_url_verified"]);

/**
 * Move from the current state to the target state.
 * Returns the target state on a legal transition.
 * Throws on an illegal transition or an unknown state.
 */
function transition(current: string, target: string): string {
  const allowed = LEGAL_TRANSITIONS.get(current);
  if (!allowed) {
    throw new Error(`Unknown lifecycle state: "${current}"`);
  }
  if (!allowed.includes(target)) {
    throw new Error(
      `Illegal lifecycle transition: "${current}" → "${target}"`,
    );
  }
  return target;
}

export { transition, LEGAL_TRANSITIONS, PIPELINE_STATES, HEALTH_STATES };
