-- Migration 02: identity schema
-- Branch: 02
-- Creates users, sessions, channel_identities tables in the identity_service schema.
-- Unique constraint on linked channel (spec: identity linking).

CREATE TABLE identity_service.users (
    user_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email             TEXT NOT NULL UNIQUE,
    email_verified    BOOLEAN NOT NULL DEFAULT false,
    display_name      TEXT,
    avatar_url        TEXT,
    locale            TEXT NOT NULL DEFAULT 'en',
    timezone          TEXT NOT NULL DEFAULT 'UTC',
    password_hash     TEXT, -- bcrypt hash for password authentication
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION identity_service;

CREATE INDEX idx_users_email ON identity_service.users (email);

CREATE TABLE identity_service.sessions (
    session_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES identity_service.users (user_id) ON DELETE CASCADE,
    tenant_id         TEXT NOT NULL,
    channel           TEXT NOT NULL,
    issued_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at        TIMESTAMPTZ NOT NULL,
    revoked_at        TIMESTAMPTZ,
    csrf_token        TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION identity_service;

CREATE INDEX idx_sessions_user_id ON identity_service.sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON identity_service.sessions (expires_at);

CREATE TABLE identity_service.channel_identities (
    identity_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES identity_service.users (user_id) ON DELETE CASCADE,
    provider          TEXT NOT NULL, -- 'google', 'github', 'telegram', 'whatsapp', 'email'
    provider_user_id  TEXT NOT NULL,
    provider_data     JSONB NOT NULL DEFAULT '{}',
    linked_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    unlinked_at       TIMESTAMPTZ,
    UNIQUE (provider, provider_user_id)
) AUTHORIZATION identity_service;

CREATE INDEX idx_channel_identities_user_id ON identity_service.channel_identities (user_id);