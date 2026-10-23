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

/** The default issuer of the service tokens that the gateway accepts. */
export const DEFAULT_SERVICE_ISSUER = "nova";

/** The default audience of the service tokens that the gateway accepts. */
export const DEFAULT_SERVICE_AUDIENCE = "nova-internal";

/** The settings of one gateway process. */
export interface Settings {
  readonly sessionSecret: string;
  readonly allowedOrigins: readonly string[];
  readonly rateLimitMax: number;
  readonly rateLimitWindowMs: number;
  readonly maxBodyBytes: number;
  readonly trustProxyHops: number;
  readonly serviceJwtSecret: string;
  readonly serviceTokenIssuer: string;
  readonly serviceTokenAudience: string;
  readonly stepUpSecret: string;
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

/** Return the settings that the environment holds. It throws when a secret is bad. */
export function loadSettings(env: NodeJS.ProcessEnv = process.env): Settings {
  const secret = env.NOVA_SESSION_SECRET ?? "";
  if (Buffer.byteLength(secret, "utf8") < MIN_SECRET_BYTES) {
    // WHY: an empty or short secret lets anyone mint a session.
    throw new SettingsError(
      "NOVA_SESSION_SECRET must hold at least " + String(MIN_SECRET_BYTES) + " bytes");
  }
  const serviceSecret = env.NOVA_SERVICE_JWT_SECRET ?? "";
  if (serviceSecret !== "" && Buffer.byteLength(serviceSecret, "utf8") < MIN_SECRET_BYTES) {
    // WHY: a short service key lets any caller mint a service token. The route then fails.
    throw new SettingsError(
      "NOVA_SERVICE_JWT_SECRET must hold at least " + String(MIN_SECRET_BYTES) + " bytes");
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
    // WHY: an empty service key keeps the internal routes closed. The gate fails shut.
    serviceJwtSecret: serviceSecret,
    serviceTokenIssuer: textValue(env.NOVA_SERVICE_TOKEN_ISSUER, DEFAULT_SERVICE_ISSUER),
    serviceTokenAudience: textValue(env.NOVA_SERVICE_TOKEN_AUDIENCE, DEFAULT_SERVICE_AUDIENCE),
    stepUpSecret: env.NOVA_STEP_UP_SECRET ?? "",
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

/** Return the text when it is a non-empty value, else the fallback. */
export function textValue(value: string | undefined, fallback: string): string {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  return value;
}
