/**
 * Nova trips service - Shared trip types.
 * One small module so the calendar helpers and the three builders can
 * import the trip shape without circular imports. The shape mirrors the
 * trips table in nova/packages/contracts/migrations/08-trips-schema.sql.
 */

/**
 * A trip instant: epoch ms, a Date (what pg returns for TIMESTAMPTZ), or an
 * offset-qualified ISO string. Offset-less strings are rejected because
 * Date.parse would read them in the host timezone and break determinism.
 */
export type TripInstant = number | Date | string;

export interface TripPlan {
  readonly title: string;
  readonly startAt: TripInstant;
  readonly endAt: TripInstant;
  readonly timezone: string;
  readonly status: string;
}
