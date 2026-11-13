/**
 * The profile version guard. A version that a match or draft referenced is
 * immutable: any edit fails. This is the pure rule the service path enforces.
 */

/** The row shape the guard reads. */
export interface ProfileVersionRow {
  readonly profile_id: string;
  readonly version: number;
  readonly used_at: string | null;
}

/** Throw when the version is used. A null used_at keeps the version editable. */
export function assertVersionEditable(row: ProfileVersionRow): void {
  if (row.used_at !== null) {
    throw new Error(`profile version in use: ${row.profile_id} v${row.version}`);
  }
}
