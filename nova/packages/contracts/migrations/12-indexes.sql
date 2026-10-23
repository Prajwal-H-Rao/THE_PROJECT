-- Migration 12: indexes on IDs, timestamps and ownership columns
-- Branch: 12
-- Adds indexes to support common query patterns. EXPLAIN uses the index.

-- Identity schema
CREATE INDEX IF NOT EXISTS idx_users_email ON identity_service.users (email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON identity_service.sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON identity_service.sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_channel_identities_user_id ON identity_service.channel_identities (user_id);
CREATE INDEX IF NOT EXISTS idx_channel_identities_provider ON identity_service.channel_identities (provider, provider_user_id);

-- Audit schema (additional indexes beyond migration 03)
CREATE INDEX IF NOT EXISTS idx_audit_occurred_at ON audit_activity_service.audit_log (occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_activity_service.audit_log (actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_activity_service.audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_activity_service.audit_log (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_policy_result ON audit_activity_service.audit_log (policy_result);
CREATE INDEX IF NOT EXISTS idx_audit_execution_status ON audit_activity_service.audit_log (execution_status);
-- Composite index for audit search (task 16)
CREATE INDEX IF NOT EXISTS idx_audit_search ON audit_activity_service.audit_log (actor_type, actor_id, action, resource_type, resource_id, policy_result, occurred_at);

-- Inbox schema
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON inbox_service.emails (user_id);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON inbox_service.emails (thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON inbox_service.emails (received_at);
CREATE INDEX IF NOT EXISTS idx_emails_labels ON inbox_service.emails USING GIN (labels);

CREATE INDEX IF NOT EXISTS idx_events_user_id ON inbox_service.events (user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON inbox_service.events (start_at);
CREATE INDEX IF NOT EXISTS idx_events_calendar_id ON inbox_service.events (calendar_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON inbox_service.events (status);

-- Tasks schema
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks_reminders_service.tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks_reminders_service.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks_reminders_service.tasks (due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks_reminders_service.tasks (parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority_due ON tasks_reminders_service.tasks (priority DESC, due_at);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes_memory_service.notes (user_id);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes_memory_service.notes USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes_memory_service.notes (created_at);
CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes_memory_service.notes (is_archived);
-- Vector index (created in migration 06)

-- Finance schema
CREATE INDEX IF NOT EXISTS idx_finances_user_id ON finance_service.finances (user_id);
CREATE INDEX IF NOT EXISTS idx_finances_occurred_at ON finance_service.finances (occurred_at);
CREATE INDEX IF NOT EXISTS idx_finances_category ON finance_service.finances (category);
CREATE INDEX IF NOT EXISTS idx_finances_type ON finance_service.finances (type);
CREATE INDEX IF NOT EXISTS idx_finances_account ON finance_service.finances (account_id);
CREATE INDEX IF NOT EXISTS idx_retention_resource ON finance_service.retention_policies (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_retention_review_date ON finance_service.retention_policies (review_date);

-- Trips schema
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips_service.trips (user_id);
CREATE INDEX IF NOT EXISTS idx_trips_start_at ON trips_service.trips (start_at);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips_service.trips (status);

-- Jobs schema
CREATE INDEX IF NOT EXISTS idx_resume_profile_user_id ON jobs_service.resume_profile (user_id);
CREATE INDEX IF NOT EXISTS idx_resume_profile_active ON jobs_service.resume_profile (is_active);
CREATE INDEX IF NOT EXISTS idx_job_listing_source_run ON jobs_service.job_listing (source_run_id);
CREATE INDEX IF NOT EXISTS idx_job_listing_posted_at ON jobs_service.job_listing (posted_at);
CREATE INDEX IF NOT EXISTS idx_job_listing_location ON jobs_service.job_listing (location);
CREATE INDEX IF NOT EXISTS idx_job_listing_remote_type ON jobs_service.job_listing (remote_type);
CREATE INDEX IF NOT EXISTS idx_job_match_profile ON jobs_service.job_match (profile_id);
CREATE INDEX IF NOT EXISTS idx_job_match_listing ON jobs_service.job_match (listing_id);
CREATE INDEX IF NOT EXISTS idx_job_match_score ON jobs_service.job_match (score DESC);
CREATE INDEX IF NOT EXISTS idx_application_draft_user ON jobs_service.application_draft (user_id);
CREATE INDEX IF NOT EXISTS idx_application_draft_status ON jobs_service.application_draft (status);
CREATE INDEX IF NOT EXISTS idx_application_submission_draft ON jobs_service.application_submission (draft_id);

-- Registry schema
CREATE INDEX IF NOT EXISTS idx_employer_targets_name ON employer_registry_service.employer_targets (name);
CREATE INDEX IF NOT EXISTS idx_employer_targets_domain ON employer_registry_service.employer_targets (domain);
CREATE INDEX IF NOT EXISTS idx_employer_targets_status ON employer_registry_service.employer_targets (status);
CREATE INDEX IF NOT EXISTS idx_employer_targets_region ON employer_registry_service.employer_targets (region);
CREATE INDEX IF NOT EXISTS idx_employer_job_sources_employer ON employer_registry_service.employer_job_sources (employer_id);
CREATE INDEX IF NOT EXISTS idx_employer_job_sources_active ON employer_registry_service.employer_job_sources (is_active);
CREATE INDEX IF NOT EXISTS idx_job_opening_employer ON employer_registry_service.job_opening (employer_id);
CREATE INDEX IF NOT EXISTS idx_job_opening_source ON employer_registry_service.job_opening (source_id);
CREATE INDEX IF NOT EXISTS idx_job_opening_posted ON employer_registry_service.job_opening (posted_at);
CREATE INDEX IF NOT EXISTS idx_job_opening_status ON employer_registry_service.job_opening (status);
CREATE INDEX IF NOT EXISTS idx_job_opening_remote_type ON employer_registry_service.job_opening (remote_type);
CREATE INDEX IF NOT EXISTS idx_job_source_run_source ON employer_registry_service.job_source_run (source_id);
CREATE INDEX IF NOT EXISTS idx_job_source_run_started ON employer_registry_service.job_source_run (started_at);

-- Queue schema
CREATE INDEX IF NOT EXISTS idx_queue_outbox_occurred_at ON jobs_service.queue_outbox (occurred_at);
CREATE INDEX IF NOT EXISTS idx_queue_outbox_producer ON jobs_service.queue_outbox (producer);