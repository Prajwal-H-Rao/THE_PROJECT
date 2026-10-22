/** The health bodies. They leak no secret. */

/** The body of a health answer. */
export interface HealthBody {
  readonly status: string;
}

/** Answer that the process runs. */
export function liveBody(): HealthBody {
  return { status: "live" };
}

/** Answer that the service accepts traffic. */
export function readyBody(): HealthBody {
  return { status: "ready" };
}
