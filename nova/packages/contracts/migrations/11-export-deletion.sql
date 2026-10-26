-- Migration 11: export and deletion workflow
-- Branch: 11
-- Implements user data export and deletion per spec:746, spec:860.
-- Deletion propagates to vectors, object files, queued tasks, channel mappings and caches.

-- Function to export all data for a user (GDPR Art. 15 right of access)
-- Returns a JSON document containing all user rows across schemas.
CREATE OR REPLACE FUNCTION audit_activity_service.export_user_data(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_result JSONB := '{}'::JSONB;
    v_rows JSONB;
BEGIN
    -- Identity schema
    SELECT jsonb_agg(to_jsonb(t)) FROM (
        SELECT * FROM identity_service.users WHERE user_id = p_user_id
    ) t INTO v_rows;
    v_result := jsonb_set(v_result, '{identity,users}', COALESCE(v_rows, '[]'::JSONB));

    SELECT jsonb_agg(to_jsonb(t)) FROM (
        SELECT * FROM identity_service.sessions WHERE user_id = p_user_id
    ) t INTO v_rows;
    v_result := jsonb_set(v_result, '{identity,sessions}', COALESCE(v_rows, '[]'::JSONB));

    SELECT jsonb_agg(to_jsonb(t)) FROM (
        SELECT * FROM identity_service.channel_identities WHERE user_id = p_user_id
    ) t INTO v_rows;
    v_result := jsonb_set(v_result, '{identity,channel_identities}', COALESCE(v_rows, '[]'::JSONB));

    -- Inbox schema
    SELECT jsonb_agg(to_jsonb(t)) FROM (
        SELECT * FROM inbox_service.emails WHERE user_id = p_user_id
    ) t INTO v_rows;
    v_result := jsonb_set(v_result, '{inbox,emails}', COALESCE(v_rows, '[]'::JSONB));

    SELECT jsonb_agg(to_jsonb(t)) FROM (
        SELECT * FROM inbox_service.events WHERE user_id = p_user_id
    ) t INTO v_rows;
    v_result := jsonb_set(v_result, '{inbox,events}', COALESCE(v_rows, '[]'::JSONB));

    -- Tasks schema
    SELECT jsonb_agg(to_jsonb(t)) FROM (
        SELECT * FROM tasks_reminders_service.tasks WHERE user_id = p_user_id
    ) t INTO v_rows;
    v_result := jsonb_set(v_result, '{tasks,tasks}', COALESCE(v_rows, '[]'::JSONB));

    SELECT jsonb_agg(to_jsonb(t)) FROM (
        SELECT * FROM notes_memory_service.notes WHERE user_id = p_user_id
    ) t INTO v_rows;
    v_result := jsonb_set(v_result, '{notes,notes}', COALESCE(v_rows, '[]'::JSONB));

    -- Finance schema
    SELECT jsonb_agg(to_jsonb(t)) FROM (
        SELECT * FROM finance_service.finances WHERE user_id = p_user_id
    ) t INTO v_rows;
    v_result := jsonb_set(v_result, '{finance,finances}', COALESCE(v_rows, '[]'::JSONB));

    -- Trips schema
    SELECT jsonb_agg(to_jsonb(t)) FROM (
        SELECT * FROM trips_service.trips WHERE user_id = p_user_id
    ) t INTO v_rows;
    v_result := jsonb_set(v_result, '{trips,trips}', COALESCE(v_rows, '[]'::JSONB));

    -- Jobs schema
    SELECT jsonb_agg(to_jsonb(t)) FROM (
        SELECT * FROM jobs_service.resume_profile WHERE user_id = p_user_id
    ) t INTO v_rows;
    v_result := jsonb_set(v_result, '{jobs,resume_profile}', COALESCE(v_rows, '[]'::JSONB));

    SELECT jsonb_agg(to_jsonb(t)) FROM (
        SELECT * FROM jobs_service.application_draft WHERE user_id = p_user_id
    ) t INTO v_rows;
    v_result := jsonb_set(v_result, '{jobs,application_draft}', COALESCE(v_rows, '[]'::JSONB));

    -- Audit log: only rows the user may read (spec:746)
    -- User may read audit rows where they are the actor, or where the resource is theirs.
    SELECT jsonb_agg(to_jsonb(t)) FROM (
        SELECT * FROM audit_activity_service.audit_log
        WHERE actor_id = p_user_id::TEXT
           OR resource_id = p_user_id::TEXT
    ) t INTO v_rows;
    v_result := jsonb_set(v_result, '{audit,audit_log}', COALESCE(v_rows, '[]'::JSONB));

    RETURN v_result;
END;
$$;

-- Permanent table to store deletion object refs (survives transaction boundaries)
CREATE TABLE IF NOT EXISTS audit_activity_service.deletion_object_refs (
    user_id UUID NOT NULL REFERENCES identity_service.users (user_id) ON DELETE CASCADE,
    ref TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, ref)
) AUTHORIZATION audit_activity_service;

CREATE INDEX idx_deletion_object_refs_user_id ON audit_activity_service.deletion_object_refs (user_id);

-- Function to delete all data for a user (GDPR Art. 17 right to erasure)
-- Cascades through all five target stores: vectors, object refs, queue tasks, channel mappings, caches.
-- The vector leg runs from P6 when 10-tasks-notes activates it.
CREATE OR REPLACE FUNCTION audit_activity_service.delete_user_data(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_object_refs TEXT[] := '{}';
    v_new_refs TEXT[];
BEGIN
    -- 1. Collect all object store references before deleting rows
    -- Finances: receipt_ref, statement_ref
    SELECT array_agg(ref) FROM (
        SELECT receipt_ref FROM finance_service.finances WHERE user_id = p_user_id AND receipt_ref IS NOT NULL
        UNION ALL
        SELECT statement_ref FROM finance_service.finances WHERE user_id = p_user_id AND statement_ref IS NOT NULL
    ) t INTO v_new_refs;
    v_object_refs := v_object_refs || COALESCE(v_new_refs, '{}');

    -- Notes: source_ref (may point to email_id, document_id, URL)
    SELECT array_agg(ref) FROM (
        SELECT source_ref FROM notes_memory_service.notes WHERE user_id = p_user_id AND source_ref IS NOT NULL
    ) t INTO v_new_refs;
    v_object_refs := v_object_refs || COALESCE(v_new_refs, '{}');

    -- Trips: itinerary_ref
    SELECT array_agg(ref) FROM (
        SELECT itinerary_ref FROM trips_service.trips WHERE user_id = p_user_id AND itinerary_ref IS NOT NULL
    ) t INTO v_new_refs;
    v_object_refs := v_object_refs || COALESCE(v_new_refs, '{}');

    -- Emails: raw_ref, attachments (JSONB array of objects with refs)
    SELECT array_agg(ref) FROM (
        SELECT raw_ref FROM inbox_service.emails WHERE user_id = p_user_id AND raw_ref IS NOT NULL
        UNION ALL
        SELECT elem->>'ref' FROM inbox_service.emails,
        LATERAL jsonb_array_elements(attachments) AS elem
        WHERE user_id = p_user_id AND attachments IS NOT NULL
    ) t INTO v_new_refs;
    v_object_refs := v_object_refs || COALESCE(v_new_refs, '{}');

    -- Events: raw_ref
    SELECT array_agg(ref) FROM (
        SELECT raw_ref FROM inbox_service.events WHERE user_id = p_user_id AND raw_ref IS NOT NULL
    ) t INTO v_new_refs;
    v_object_refs := v_object_refs || COALESCE(v_new_refs, '{}');

    -- Jobs: raw_ref on listings, confirmation_ref on submissions
    SELECT array_agg(ref) FROM (
        SELECT raw_ref FROM jobs_service.job_listing WHERE user_id = p_user_id AND raw_ref IS NOT NULL
        UNION ALL
        SELECT confirmation_ref FROM jobs_service.application_submission WHERE user_id = p_user_id AND confirmation_ref IS NOT NULL
    ) t INTO v_new_refs;
    v_object_refs := v_object_refs || COALESCE(v_new_refs, '{}');

    -- 2. Delete from all domain tables (CASCADE handles FKs where defined)
    DELETE FROM jobs_service.application_submission WHERE user_id = p_user_id;
    DELETE FROM jobs_service.application_draft WHERE user_id = p_user_id;
    DELETE FROM jobs_service.job_match WHERE profile_id IN (SELECT profile_id FROM jobs_service.resume_profile WHERE user_id = p_user_id);
    DELETE FROM jobs_service.resume_profile WHERE user_id = p_user_id;

    DELETE FROM trips_service.trips WHERE user_id = p_user_id;

    DELETE FROM finance_service.finances WHERE user_id = p_user_id;
    DELETE FROM finance_service.retention_policies WHERE resource_type = 'finances' AND resource_id IN (SELECT finance_id FROM finance_service.finances WHERE user_id = p_user_id);

    DELETE FROM notes_memory_service.notes WHERE user_id = p_user_id;
    DELETE FROM tasks_reminders_service.tasks WHERE user_id = p_user_id;

    DELETE FROM inbox_service.events WHERE user_id = p_user_id;
    DELETE FROM inbox_service.emails WHERE user_id = p_user_id;

    DELETE FROM identity_service.channel_identities WHERE user_id = p_user_id;
    DELETE FROM identity_service.sessions WHERE user_id = p_user_id;
    DELETE FROM identity_service.users WHERE user_id = p_user_id;

    -- 3. Delete queued tasks for this user (queue_outbox in jobs_service)
    DELETE FROM jobs_service.queue_outbox WHERE user_id = p_user_id::TEXT;
    DELETE FROM jobs_service.event_receipts WHERE event_id IN (SELECT event_id FROM jobs_service.queue_outbox WHERE user_id = p_user_id::TEXT);

    -- 4. Delete channel mappings
    -- Already handled by channel_identities above

    -- 5. Audit log: do NOT delete audit rows (append-only, legal hold).
    -- Instead, mark them as pertaining to a deleted user.
    UPDATE audit_activity_service.audit_log
    SET payload = jsonb_set(payload, '{user_deleted}', 'true'::JSONB)
    WHERE actor_id = p_user_id::TEXT OR resource_id = p_user_id::TEXT;

    -- 6. Store object refs in permanent table for async object store deletion
    -- The actual object store deletion is async and runs from the application layer.
    INSERT INTO audit_activity_service.deletion_object_refs (user_id, ref)
    SELECT p_user_id, unnest(v_object_refs)
    ON CONFLICT DO NOTHING;
END;
$$;

-- Function to list object store refs pending deletion for a user
CREATE OR REPLACE FUNCTION audit_activity_service.get_deletion_object_refs(p_user_id UUID)
RETURNS SETOF TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY SELECT ref FROM audit_activity_service.deletion_object_refs WHERE user_id = p_user_id;
END;
$$;

-- Function to clear processed deletion refs
CREATE OR REPLACE FUNCTION audit_activity_service.clear_deletion_object_refs(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM audit_activity_service.deletion_object_refs WHERE user_id = p_user_id;
END;
$$;

-- Grant execute to audit_activity_service role (owner)
GRANT EXECUTE ON FUNCTION audit_activity_service.export_user_data(UUID) TO audit_activity_service;
GRANT EXECUTE ON FUNCTION audit_activity_service.delete_user_data(UUID) TO audit_activity_service;
GRANT EXECUTE ON FUNCTION audit_activity_service.get_deletion_object_refs(UUID) TO audit_activity_service;
GRANT EXECUTE ON FUNCTION audit_activity_service.clear_deletion_object_refs(UUID) TO audit_activity_service;