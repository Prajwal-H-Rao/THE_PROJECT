-- Migration 08: trips schema
-- Branch: 08
-- Creates trips table in the trips_service schema.
-- Object-storage pointers for itineraries, tickets.

CREATE TABLE trips_service.trips (
    trip_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    title             TEXT NOT NULL,
    description       TEXT,
    start_at          TIMESTAMPTZ NOT NULL,
    end_at            TIMESTAMPTZ NOT NULL,
    timezone          TEXT NOT NULL DEFAULT 'UTC',
    status            TEXT NOT NULL DEFAULT 'planned', -- 'planned', 'active', 'completed', 'cancelled'
    itinerary_ref     TEXT, -- pointer to object store for full itinerary PDF
    metadata          JSONB NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
) AUTHORIZATION trips_service;

CREATE INDEX idx_trips_user_id ON trips_service.trips (user_id);
CREATE INDEX idx_trips_start_at ON trips_service.trips (start_at);
CREATE INDEX idx_trips_status ON trips_service.trips (status);