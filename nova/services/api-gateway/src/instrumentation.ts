/** The startup check of the gateway. It holds the session secret before the server serves. */

import { settings } from "@/lib/settings";

/** Check the settings once when the server starts. */
export function register(): void {
  // WHY: a missing secret would let anyone mint a session. The production build phase
  // skips this hook, so the build never needs the secret. At runtime the hook fails, the
  // server never prepares, and every request answers 500.
  settings();
}
