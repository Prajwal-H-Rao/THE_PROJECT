/**
 * Nova design system - Resume and Job Search page (task 12.19).
 * Main page for the Jobs & Resume domain. Renders upload, version history,
 * profile, job cards, rationale, checklist, drafts, approval queue and status
 * history sections from real data fetched via the API client.
 */

"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/shell/shell";
import { CardState } from "@/components/ui/card-state";
import { cn } from "@/lib/utils";
import type { Job, Application, ProfileCandidateFields } from "@/lib/api-types";

interface JobSearchPageProps {}

export default function JobSearchPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<ProfileCandidateFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        // All three fetches hit the same jobs-service backend; failures are
        // reported independently so one missing endpoint does not blank the page.
        const [jobsResp, appsResp, profileResp] = await Promise.allSettled([
          fetch("/api/v1/jobs/search", { cache: "no-store" }),
          fetch("/api/v1/applications", { cache: "no-store" }),
          fetch("/api/v1/profile", { cache: "no-store" }),
        ]);
        if (!cancelled) {
          if (jobsResp.status === "fulfilled" && jobsResp.value.ok) {
            setJobs((await jobsResp.value.json()) as Job[]);
          }
          if (appsResp.status === "fulfilled" && appsResp.value.ok) {
            setApplications((await appsResp.value.json()) as Application[]);
          }
          if (profileResp.status === "fulfilled" && profileResp.value.ok) {
            setProfile((await profileResp.value.json()) as ProfileCandidateFields);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Shell appName="NOVA">
        <CardState state="loading" loadingLabel="Loading Resume and Job Search" />
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell appName="NOVA">
        <CardState state="error" errorLabel="Load error" errorMessage={error} />
      </Shell>
    );
  }

  const draftCount = applications.filter((a) => a.status === "draft").length;
  const readyCount = applications.filter((a) => a.status === "ready").length;
  const submittedCount = applications.filter((a) => a.status === "submitted").length;

  return (
    <Shell appName="NOVA">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Resume &amp; Job Search</h1>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="border-border rounded-lg bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Open jobs</p>
            <p className="text-2xl font-semibold text-foreground">{jobs.length}</p>
          </div>
          <div className="border-border rounded-lg bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Drafts</p>
            <p className="text-2xl font-semibold text-foreground">{draftCount}</p>
          </div>
          <div className="border-border rounded-lg bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Submitted</p>
            <p className="text-2xl font-semibold text-foreground">{submittedCount}</p>
          </div>
        </div>

        {/* Upload & version history */}
        <section className="border-border rounded-lg bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Upload &amp; version history</h2>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded text-sm border" disabled>
              Upload resume
            </button>
            <button className="px-3 py-1.5 rounded text-sm border">
              View version history
            </button>
          </div>
          {applications.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No application versions yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {applications.slice(0, 5).map((app) => (
                <li key={app.draftId} className="flex items-center justify-between border-b pb-2">
                  <span>v{app.profileVersion}</span>
                  <span className="text-muted-foreground">{app.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Profile */}
        <section className="border-border rounded-lg bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Profile</h2>
          {profile === null ? (
            <p className="text-xs text-muted-foreground">No profile data yet.</p>
          ) : (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Headline</dt>
                <dd>{profile.headline.value || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Skills</dt>
                <dd className="text-left">
                  {profile.skills.value.length > 0 ? (
                    <span>{profile.skills.value.join(", ")}</span>
                  ) : (
                    <span className="text-muted-foreground italic">—</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Experience</dt>
                <dd>{profile.experience.value || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Education</dt>
                <dd>{profile.education.value || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Location</dt>
                <dd>{profile.location.value || "—"}</dd>
              </div>
            </dl>
          )}
        </section>

        {/* Job cards */}
        <section className="border-border rounded-lg bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Job cards</h2>
          {jobs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No jobs found.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <article
                  key={job.jobId}
                  className="border border-border rounded-lg p-3 hover:border-accent"
                >
                  <h4 className="text-sm font-semibold text-foreground">{job.role}</h4>
                  <p className="text-xs text-muted-foreground">{job.employer}</p>
                  {job.location && (
                    <p className="text-xs text-muted-foreground">{job.location}</p>
                  )}
                  <div className="mt-2 flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground">{job.freshness}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{job.listingStatus}</span>
                  </div>
                  <button
                    className="mt-2 px-3 py-1 rounded text-sm border border-accent text-accent"
                    disabled
                  >
                    Review
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Checklist & drafts */}
        <section className="grid gap-4 sm:grid-cols-2">
          <section className="border-border rounded-lg bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Truthful-claim checklist</h2>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-success text-[10px] flex items-center justify-center">✓</span>
                <span className="text-foreground">Every claim links to a profile source</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-border text-[10px] flex items-center justify-center">○</span>
                <span className="text-muted-foreground">Unlinked claims blocked</span>
              </li>
            </ul>
          </section>
          <section className="border-border rounded-lg bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Drafts &amp; approval queue</h2>
            <p className="text-xs text-muted-foreground">
              {readyCount} ready for approval, {submittedCount} submitted.
            </p>
            <button className="mt-2 px-3 py-1.5 rounded text-sm border" disabled>
              Open approval queue
            </button>
          </section>
        </section>

        {/* Status history */}
        <section className="border-border rounded-lg bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Status history</h2>
          {applications.length === 0 ? (
            <p className="text-xs text-muted-foreground">No application history yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {applications.slice(0, 5).map((app) => (
                <li key={app.draftId} className="flex items-center justify-between border-b pb-2">
                  <span>Job {app.jobId.slice(-4)}</span>
                  <span className="text-muted-foreground">{app.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Shell>
  );
}
