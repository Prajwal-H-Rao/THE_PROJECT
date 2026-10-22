/** The settings of the api-gateway. The environment supplies the values. */

/** The shortest session secret that the gateway accepts. */
export const MIN_SECRET_BYTES = 32;

/** The default body limit. It holds 1 MiB. */
export const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;

/** The default rate limit. It holds 60 requests per key and window. */
export const DEFAULT_RATE_LIMIT_MAX = 60;

/** The default rate limit window. It holds one minute. */
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;

/** The default number of trusted proxy hops. It holds none. */
export const DEFAULT_TRUST_PROXY_HOPS = 0;

/** The settings of one gateway process. */
export interface Settings {
  readonly sessionSecret: string;
  readonly allowedOrigins: readonly string[];
  readonly rateLimitMax: number;
  readonly rateLimitWindowMs: number;
  readonly maxBodyBytes: number;
  readonly trustProxyHops: number;
}

/** The error that a bad environment raises. Its message holds no secret. */
export class SettingsError extends Error {}

let cached: Settings | null = null;

/** Return the settings of the process. The first call reads the environment. */
export function settings(env: NodeJS.ProcessEnv = process.env): Settings {
  if (cached === null) {
    cached = loadSettings(env);
  }
  return cached;
}

/** Return the settings that the environment holds. It throws when the secret is missing. */
export function loadSettings(env: NodeJS.ProcessEnv = process.env): Settings {
  const secret = env.NOVA_SESSION_SECRET ?? "";
  if (Buffer.byteLength(secret, "utf8") < MIN_SECRET_BYTES) {
    // WHY: an empty or short secret lets anyone mint a session.
    throw new SettingsError(
      "NOVA_SESSION_SECRET must hold at least " + String(MIN_SECRET_BYTES) + " bytes");
  }
  return {
    sessionSecret: secret,
    allowedOrigins: parseOrigins(env.NOVA_ALLOWED_ORIGINS),
    rateLimitMax: positiveInteger(Number(env.NOVA_RATE_LIMIT_MAX ?? DEFAULT_RATE_LIMIT_MAX), DEFAULT_RATE_LIMIT_MAX),
    rateLimitWindowMs: positiveInteger(
      Number(env.NOVA_RATE_LIMIT_WINDOW_MS ?? DEFAULT_RATE_LIMIT_WINDOW_MS), DEFAULT_RATE_LIMIT_WINDOW_MS),
    maxBodyBytes: positiveInteger(
      Number(env.NOVA_MAX_BODY_BYTES ?? DEFAULT_MAX_BODY_BYTES), DEFAULT_MAX_BODY_BYTES),
    trustProxyHops: trustHops(env.NOVA_TRUST_PROXY),
  };
}

/** Return the origins that the environment allows. An empty list allows none. */
export function parseOrigins(value: string | undefined): readonly string[] {
  if (value === undefined || value === "") {
    return [];
  }
  return value.split(",").map((item) => item.trim()).filter((item) => item !== "");
}

/** Return the number of trusted proxy hops. It holds the default when the value is bad. */
export function trustHops(value: string | undefined): number {
  const hops = Number(value ?? DEFAULT_TRUST_PROXY_HOPS);
  if (!Number.isInteger(hops) || hops < 0) {
    return DEFAULT_TRUST_PROXY_HOPS;
  }
  return hops;
}

/** Return the number when it is a positive integer, else the fallback. */
export function positiveInteger(value: number, fallback: number): number {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
