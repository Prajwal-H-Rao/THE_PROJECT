-- Migration 01: roles and schemas
-- Branch: 01
-- Creates all service roles and their owned schemas.
-- The password of every role arrives from the environment.
-- A role holds no right on the schema of another service.

-- Services that hold no role (per spec):
-- api_gateway_bff      - routes to services, owns no store
-- channel_adapter_telegram - spec gives no direct data-store query outside APIs
-- document_service     - spec gives it no primary database credential
-- inference_worker     - spec gives it no database secret
-- job_source_worker    - feeds jobs service, owns no store
-- scheduler_worker     - spec gives queue ownership only
-- web_app              - browser holds session material, app owns no store

\getenv password_agent_orchestrator NOVA_PG_PASSWORD_AGENT_ORCHESTRATOR
CREATE ROLE agent_orchestrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'password_agent_orchestrator';

\getenv password_audit_activity_service NOVA_PG_PASSWORD_AUDIT_ACTIVITY_SERVICE
CREATE ROLE audit_activity_service LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'password_audit_activity_service';

\getenv password_calendar_service NOVA_PG_PASSWORD_CALENDAR_SERVICE
CREATE ROLE calendar_service LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'password_calendar_service';

\getenv password_channel_adapter_whatsapp NOVA_PG_PASSWORD_CHANNEL_ADAPTER_WHATSAPP
CREATE ROLE channel_adapter_whatsapp LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'password_channel_adapter_whatsapp';

\getenv password_employer_registry_service NOVA_PG_PASSWORD_EMPLOYER_REGISTRY_SERVICE
CREATE ROLE employer_registry_service LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'password_employer_registry_service';

\getenv password_finance_service NOVA_PG_PASSWORD_FINANCE_SERVICE
CREATE ROLE finance_service LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'password_finance_service';

\getenv password_identity_service NOVA_PG_PASSWORD_IDENTITY_SERVICE
CREATE ROLE identity_service LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'password_identity_service';

\getenv password_inbox_service NOVA_PG_PASSWORD_INBOX_SERVICE
CREATE ROLE inbox_service LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'password_inbox_service';

\getenv password_integration_registry NOVA_PG_PASSWORD_INTEGRATION_REGISTRY
CREATE ROLE integration_registry LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'password_integration_registry';

\getenv password_jobs_service NOVA_PG_PASSWORD_JOBS_SERVICE
CREATE ROLE jobs_service LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'password_jobs_service';

\getenv password_model_gateway NOVA_PG_PASSWORD_MODEL_GATEWAY
CREATE ROLE model_gateway LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'password_model_gateway';

\getenv password_notes_memory_service NOVA_PG_PASSWORD_NOTES_MEMORY_SERVICE
CREATE ROLE notes_memory_service LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'password_notes_memory_service';

\getenv password_notification_service NOVA_PG_PASSWORD_NOTIFICATION_SERVICE
CREATE ROLE notification_service LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'password_notification_service';

\getenv password_policy_approval_service NOVA_PG_PASSWORD_POLICY_APPROVAL_SERVICE
CREATE ROLE policy_approval_service LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'password_policy_approval_service';

\getenv password_tasks_reminders_service NOVA_PG_PASSWORD_TASKS_REMINDERS_SERVICE
CREATE ROLE tasks_reminders_service LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'password_tasks_reminders_service';

\getenv password_trips_service NOVA_PG_PASSWORD_TRIPS_SERVICE
CREATE ROLE trips_service LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD :'password_trips_service';

-- The public schema holds no object. No service may create one there.
REVOKE ALL ON SCHEMA public FROM PUBLIC;

CREATE SCHEMA agent_orchestrator AUTHORIZATION agent_orchestrator;
CREATE SCHEMA audit_activity_service AUTHORIZATION audit_activity_service;
CREATE SCHEMA calendar_service AUTHORIZATION calendar_service;
CREATE SCHEMA channel_adapter_whatsapp AUTHORIZATION channel_adapter_whatsapp;
CREATE SCHEMA employer_registry_service AUTHORIZATION employer_registry_service;
CREATE SCHEMA finance_service AUTHORIZATION finance_service;
CREATE SCHEMA identity_service AUTHORIZATION identity_service;
CREATE SCHEMA inbox_service AUTHORIZATION inbox_service;
CREATE SCHEMA integration_registry AUTHORIZATION integration_registry;
CREATE SCHEMA jobs_service AUTHORIZATION jobs_service;
CREATE SCHEMA model_gateway AUTHORIZATION model_gateway;
CREATE SCHEMA notes_memory_service AUTHORIZATION notes_memory_service;
CREATE SCHEMA notification_service AUTHORIZATION notification_service;
CREATE SCHEMA policy_approval_service AUTHORIZATION policy_approval_service;
CREATE SCHEMA tasks_reminders_service AUTHORIZATION tasks_reminders_service;
CREATE SCHEMA trips_service AUTHORIZATION trips_service;