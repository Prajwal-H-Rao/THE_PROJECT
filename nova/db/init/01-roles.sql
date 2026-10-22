-- The roles of the NOVA services that own data. One role per service.
-- The password of every role arrives from the environment. The local secret file of the compose
-- stack holds them and git ignores that file. The values are synthetic local defaults.
-- Every role holds its own password. A service that holds one credential cannot open another.

-- The services of the catalogue that hold no role, with the reason.
-- exclusion: api_gateway_bff
-- It routes to the services and owns no store.
-- exclusion: channel_adapter_telegram
-- The spec gives it no direct data-store query outside the APIs.
-- exclusion: document_service
-- The spec gives it no primary database credential.
-- exclusion: inference_worker
-- The spec gives it no database secret.
-- exclusion: job_source_worker
-- It feeds the jobs service and owns no store.
-- exclusion: scheduler_worker
-- The spec gives it queue ownership only.
-- exclusion: web_app
-- The browser holds the session material and the app owns no store.

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
