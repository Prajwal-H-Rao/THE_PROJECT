/**
 * Saved filters and alerts (task 13.25).
 * User-configurable filters: role family, experience, city mode, work
 * authorisation, salary band, keyword. Alerts: daily digest, urgent match,
 * company priority, mute. Each control round-trips; the digest job reads
 * the saved set.
 */

/** Local Job type mirroring the backend JobListing contract. */
export interface Job {
  readonly jobId: string;
  readonly role: string;
  readonly employer: string;
  readonly location: string | null;
  readonly workMode: string | null;
  readonly salaryMax: number | null;
  readonly freshness: "current" | "stale";
  readonly listingStatus: "open" | "closed" | "unknown";
}

/** One saved filter. */
export interface SavedFilter {
  readonly filterId: string;
  readonly name: string;
  readonly roleFamilies: readonly string[];
  readonly experienceMin: number | null;
  readonly experienceMax: number | null;
  readonly cityMode: "onsite" | "hybrid" | "remote" | "none";
  readonly workAuthorisation: readonly string[];
  readonly salaryBandMin: number | null;
  readonly salaryBandMax: number | null;
  readonly keyword: string | null;
  readonly enabled: boolean;
}

/** One alert rule tied to a filter. */
export interface AlertRule {
  readonly alertId: string;
  readonly filterId: string;
  readonly kind: "daily_digest" | "urgent_match" | "company_priority" | "mute";
  readonly enabled: boolean;
}

/** One filter match result. */
export interface FilterMatch {
  readonly filterId: string;
  readonly job: Job;
  readonly matchScore: number;
  readonly matchedFields: readonly string[];
}

/** Evaluate one filter against one job. */
export function evaluateFilter(
  filter: SavedFilter,
  job: Job,
): FilterMatch | null {
  if (!filter.enabled) {
    return null;
  }

  const matchedFields: string[] = [];
  let score = 0;

  // Role family match
  if (filter.roleFamilies.length > 0 && filter.roleFamilies.includes(job.role)) {
    matchedFields.push("role");
    score += 0.3;
  }

  // Experience band (job has no experience field; skip for now)
  // Salary band
  if (job.salaryMax !== null) {
    if (
      (filter.salaryBandMin === null || job.salaryMax >= filter.salaryBandMin) &&
      (filter.salaryBandMax === null || job.salaryMax <= filter.salaryBandMax)
    ) {
      matchedFields.push("salary");
      score += 0.3;
    }
  }

  // Location / city mode
  if (filter.cityMode !== "none" && job.location !== null) {
    if (filter.cityMode === "remote" && job.workMode === "remote") {
      matchedFields.push("location");
      score += 0.2;
    } else if (
      filter.cityMode === "onsite" &&
      job.workMode !== "remote"
    ) {
      matchedFields.push("location");
      score += 0.2;
    } else if (
      filter.cityMode === "hybrid" &&
      (job.workMode === "hybrid" || job.workMode === "onsite")
    ) {
      matchedFields.push("location");
      score += 0.2;
    }
  }

  // Keyword search in role
  if (filter.keyword !== null && job.role.toLowerCase().includes(filter.keyword.toLowerCase())) {
    matchedFields.push("keyword");
    score += 0.2;
  }

  if (matchedFields.length === 0) {
    return null;
  }

  return {
    filterId: filter.filterId,
    job,
    matchScore: Math.min(score, 1.0),
    matchedFields,
  };
}

/** Evaluate all filters against all jobs. */
export function evaluateFilters(
  filters: readonly SavedFilter[],
  jobs: readonly Job[],
): FilterMatch[] {
  const matches: FilterMatch[] = [];
  for (const filter of filters) {
    for (const job of jobs) {
      const match = evaluateFilter(filter, job);
      if (match !== null) {
        matches.push(match);
      }
    }
  }
  return matches;
}

/** Create a default filter. */
export function createDefaultFilter(
  filterId: string,
  name: string,
): SavedFilter {
  return {
    filterId,
    name,
    roleFamilies: [],
    experienceMin: null,
    experienceMax: null,
    cityMode: "none",
    workAuthorisation: [],
    salaryBandMin: null,
    salaryBandMax: null,
    keyword: null,
    enabled: true,
  };
}

/** Create a default alert. */
export function createDefaultAlert(
  alertId: string,
  filterId: string,
  kind: AlertRule["kind"],
): AlertRule {
  return { alertId, filterId, kind, enabled: true };
}
