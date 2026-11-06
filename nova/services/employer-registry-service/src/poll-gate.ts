/**
 * Nova design system - Employer Registry service.
 * Poll gate: the verified_permitted gate from plan task 6 (spec:558,
 * spec:638). No poll may fire before the source's access method is
 * verified and the connector is configured.
 * The pollable set is DERIVED from the lifecycle transition map, never
 * hand-maintained: a state is pollable when it has a legal edge to
 * "polling", plus "polling" itself, minus the user-action states
 * manual_only and paused (spec:633 — the scheduler never polls them;
 * the explicit user resume transition re-enters polling).
 * Contract: canPoll is necessary, not sufficient. Due time, jitter,
 * concurrency and cache validators are the scheduler's jobs (tasks 15-16).
 */

import { LEGAL_TRANSITIONS } from "./lifecycle.js";

// States from which a poll may fire, derived from the lifecycle map.
const POLLABLE_STATES: ReadonlySet<string> = (() => {
  const pollable: Set<string> = new Set(["polling"]);
  for (const [current, targets] of LEGAL_TRANSITIONS) {
    if (targets.includes("polling") && current !== "manual_only" && current !== "paused") {
      pollable.add(current);
    }
  }
  return pollable;
})();

/**
 * Return true when a poll may fire while the row sits in this state.
 * Fail-closed: unknown states (including needs_verification) refuse.
 */
function canPoll(state: string): boolean {
  return POLLABLE_STATES.has(state);
}

/**
 * The worker's poll entry point. Throws when the source is not
 * verified-permitted for polling. Every future poller calls this
 * before fetching anything.
 */
function guardPoll(state: string): void {
  if (!canPoll(state)) {
    throw new Error(
      `Poll refused: source state "${state}" is not verified_permitted for polling`,
    );
  }
}

export { canPoll, guardPoll, POLLABLE_STATES };
