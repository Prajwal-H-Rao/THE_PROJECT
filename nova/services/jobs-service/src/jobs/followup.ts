/**
 * Follow-up state machine (task 12.16).
 * States: applied, assessment, interview, rejected, withdrawn, unknown.
 * Status moves only from user input or source evidence (spec:531).
 * Illegal transitions fail.
 */

export type FollowUpState =
  | "applied"
  | "assessment"
  | "interview"
  | "rejected"
  | "withdrawn"
  | "unknown";

/** Legal transitions: from state -> allowed to states. */
const LEGAL_TRANSITIONS: ReadonlyMap<FollowUpState, ReadonlySet<FollowUpState>> = new Map([
  ["unknown", new Set(["applied", "rejected", "withdrawn"])],
  ["applied", new Set(["assessment", "rejected", "withdrawn"])],
  ["assessment", new Set(["interview", "rejected", "withdrawn"])],
  ["interview", new Set(["rejected", "withdrawn"])],
  ["rejected", new Set()],
  ["withdrawn", new Set()],
]);

/** Transition one state to another. Throws on an illegal transition. */
export function transitionState(
  current: FollowUpState,
  target: FollowUpState,
): FollowUpState {
  const allowed = LEGAL_TRANSITIONS.get(current);
  if (!allowed || !allowed.has(target)) {
    throw new Error(`Illegal follow-up transition: ${current} -> ${target}`);
  }
  return target;
}

/** Return true when a transition is legal without throwing. */
export function canTransition(current: FollowUpState, target: FollowUpState): boolean {
  const allowed = LEGAL_TRANSITIONS.get(current);
  return allowed !== undefined && allowed.has(target);
}

/** Return all legal targets from one state. */
export function legalTargets(current: FollowUpState): FollowUpState[] {
  return [...(LEGAL_TRANSITIONS.get(current) ?? [])];
}
