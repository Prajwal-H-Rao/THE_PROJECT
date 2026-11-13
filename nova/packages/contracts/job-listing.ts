/** The job listing contract. One listing carries its source provenance and two state axes. */

/**
 * Field-to-column map against `jobs_service.job_listing` (migrations/09-jobs-schema.sql):
 *
 *   connector_id        -> no column yet (spec:536 "source connector ID")
 *   canonical_uri       -> no column yet (spec:536; `source_url` holds the raw source URL)
 *   employer            -> column `company`
 *   employer_id         -> column `employer_id`
 *   title               -> column `title` (the role)
 *   location            -> column `location`
 *   work_mode           -> column `remote_type` (values pinned to the column comment)
 *   posted_at           -> column `posted_at`
 *   expires_at          -> column `expires_at` (spec:536 "expiry timestamps if provided")
 *   fingerprint         -> column `fingerprint` (the SHA-256 source hash)
 *   last_verified_at    -> no column yet (spec:536 "last verified"; spec:584 "last seen")
 *   terms_classification -> no column yet (spec:536 "terms/access classification";
 *                          no vocabulary is defined anywhere, so any non-empty text is legal)
 *   source_job_id       -> no column yet (spec:523 "source job ID")
 *   retrieved_at        -> no column yet (spec:523 "retrieval time")
 *   freshness_state     -> no column yet (spec:639 "current or stale state")
 *   listing_status      -> no column yet (vocabulary from spec:540 `job_opening`)
 */

/** The work mode values of the `remote_type` column comment. */
export type WorkMode = "remote" | "hybrid" | "onsite";

/** The freshness axis of spec:639. It says when the listing was last checked. */
export type FreshnessState = "current" | "stale";

/** The liveness axis of spec:540. A stale listing keeps its last-known liveness. */
export type ListingStatus = "open" | "closed" | "unknown";

/** One normalised job listing with source provenance. Field names match the DB columns. */
export interface JobListing {
  readonly connector_id: string;
  readonly canonical_uri: string;
  readonly employer: string;
  readonly employer_id?: string;
  readonly title: string;
  readonly location?: string;
  readonly work_mode?: WorkMode;
  readonly posted_at?: string;
  readonly expires_at?: string;
  readonly fingerprint: string;
  readonly last_verified_at: string;
  readonly terms_classification: string;
  readonly source_job_id: string;
  readonly retrieved_at: string;
  readonly freshness_state: FreshnessState;
  readonly listing_status: ListingStatus;
}

/** The keys the contract knows. Any other key is an unknown field and fails validation. */
const KNOWN_KEYS: ReadonlySet<string> = new Set([
  "connector_id",
  "canonical_uri",
  "employer",
  "employer_id",
  "title",
  "location",
  "work_mode",
  "posted_at",
  "expires_at",
  "fingerprint",
  "last_verified_at",
  "terms_classification",
  "source_job_id",
  "retrieved_at",
  "freshness_state",
  "listing_status",
]);

/** The state values the contract accepts. */
const WORK_MODES: ReadonlySet<string> = new Set(["remote", "hybrid", "onsite"]);
const FRESHNESS_STATES: ReadonlySet<string> = new Set(["current", "stale"]);
const LISTING_STATUSES: ReadonlySet<string> = new Set(["open", "closed", "unknown"]);

/** Return true when the value is a non-empty text. */
function isText(value: unknown): value is string {
  return typeof value === "string" && value !== "";
}

/** Return true when the value is a text that parses as a date. */
function isTimestamp(value: unknown): value is string {
  return isText(value) && !Number.isNaN(Date.parse(value));
}

/** Return true when the value is a 64-character lowercase hex string. */
function isHex64(value: unknown): value is string {
  return isText(value) && /^[0-9a-f]{64}$/.test(value);
}

/** Return true when the value is an absolute http or https URL. */
function isHttpUrl(value: unknown): value is string {
  if (!isText(value)) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Return true when every key of the record is one the contract knows. */
function hasOnlyKnownKeys(record: Record<string, unknown>): boolean {
  for (const key of Object.keys(record)) {
    if (!KNOWN_KEYS.has(key)) {
      return false;
    }
  }
  return true;
}

/**
 * Validate one job listing. A rejection returns null.
 * Unknown fields, empty required values and malformed formats all fail.
 */
export function readJobListing(input: unknown): JobListing | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const record = input as Record<string, unknown>;
  if (!hasOnlyKnownKeys(record)) {
    return null;
  }
  if (!isText(record["connector_id"]) || !isHttpUrl(record["canonical_uri"])) {
    return null;
  }
  if (!isText(record["employer"]) || !isText(record["title"])) {
    return null;
  }
  if (record["employer_id"] !== undefined && !isText(record["employer_id"])) {
    return null;
  }
  if (record["location"] !== undefined && !isText(record["location"])) {
    return null;
  }
  if (record["work_mode"] !== undefined && !WORK_MODES.has(record["work_mode"] as string)) {
    return null;
  }
  if (record["posted_at"] !== undefined && !isTimestamp(record["posted_at"])) {
    return null;
  }
  if (record["expires_at"] !== undefined && !isTimestamp(record["expires_at"])) {
    return null;
  }
  if (!isHex64(record["fingerprint"])) {
    return null;
  }
  if (!isTimestamp(record["last_verified_at"]) || !isTimestamp(record["retrieved_at"])) {
    return null;
  }
  if (!isText(record["terms_classification"])) {
    return null;
  }
  if (!isText(record["source_job_id"])) {
    return null;
  }
  if (!FRESHNESS_STATES.has(record["freshness_state"] as string)) {
    return null;
  }
  if (!LISTING_STATUSES.has(record["listing_status"] as string)) {
    return null;
  }
  return input as JobListing;
}
