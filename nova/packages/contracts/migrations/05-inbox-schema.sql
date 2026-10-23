-- Migration 05: inbox schema (emails, events)
-- Branch: 05
-- Creates emails and events tables in the inbox_service schema.
-- Ownership column is indexed.

CREATE TABLE inbox_service.emails (
    email_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    message_id        TEXT NOT NULL,
    thread_id         TEXT,
    from_address      TEXT NOT NULL,
    to_addresses      TEXT[] NOT NULL DEFAULT '{}',
    cc_addresses      TEXT[] NOT NULL DEFAULT '{}',
    subject           TEXT,
    snippet           TEXT,
    body_text         TEXT,
    body_html         TEXT,
    received_at       TIMESTAMPTZ NOT NULL,
    labels            TEXT[] NOT NULL DEFAULT '{}',
    attachments       JSONB NOT NULL DEFAULT '[]',
    raw_ref           TEXT, -- pointer to object store for full raw message
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, message_id)
) AUTHORIZATION inbox_service;

CREATE INDEX idx_emails_user_id ON inbox_service.emails (user_id);
CREATE INDEX idx_emails_thread_id ON inbox_service.emails (thread_id);
CREATE INDEX idx_emails_received_at ON inbox_service.emails (received_at);

CREATE TABLE inbox_service.events (
    event_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    provider_event_id TEXT NOT NULL,
    calendar_id       TEXT,
    summary           TEXT,
    description       TEXT,
    location          TEXT,
    start_at          TIMESTAMPTZ NOT NULL,
    end_at            TIMESTAMPTZ NOT NULL,
    status            TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'tentative', 'cancelled'
    attendees         JSONB NOT NULL DEFAULT '[]',
    recurrence_rule   TEXT,
    raw_ref           TEXT, -- pointer to object store for full raw event
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, provider_event_id)
) AUTHORIZATION inbox_service;

CREATE INDEX idx_events_user_id ON inbox_service.events (user_id);
CREATE INDEX idx_events_start_at ON inbox_service.events (start_at);
CREATE INDEX idx_events_calendar_id ON inbox_service.events (calendar_id);