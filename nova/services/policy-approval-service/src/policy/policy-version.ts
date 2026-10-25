/** Policy version management. Provides a configurable global policy version
 *  that gets pinned in grants. Bumping the version invalidates all existing grants. */

export interface PolicyVersionConfig {
  readonly currentVersion: number;
}

/** Default policy version. Can be overridden via environment variable POLICY_VERSION. */
const DEFAULT_POLICY_VERSION = Number(process.env.POLICY_VERSION ?? "1");

/** Global policy version state. In production, this would be stored in DB. */
let currentPolicyVersion = DEFAULT_POLICY_VERSION;

/** Get the current policy version. */
export function getPolicyVersion(): number {
  return currentPolicyVersion;
}

/** Set the policy version. Returns the new version.
 *  WHY: Bumping the policy version invalidates all existing grants
 *  because verifyBinding checks for policy_version_mismatch. */
export function setPolicyVersion(version: number): number {
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("Policy version must be a positive integer");
  }
  currentPolicyVersion = version;
  return currentPolicyVersion;
}

/** Bump the policy version by one. Returns the new version. */
export function bumpPolicyVersion(): number {
  return setPolicyVersion(currentPolicyVersion + 1);
}

/** Reset to default (for tests). */
export function resetPolicyVersion(): void {
  currentPolicyVersion = DEFAULT_POLICY_VERSION;
}

/** Get the policy version config object. */
export function getPolicyVersionConfig(): PolicyVersionConfig {
  return { currentVersion: currentPolicyVersion };
}