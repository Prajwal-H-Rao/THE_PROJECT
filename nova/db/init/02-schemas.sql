-- The schemas of the NOVA services. One schema per role, owned by that role.
-- A role holds no right on the schema of another service, so no service can read the data of
-- another service. The grant of a schema runs only to its owner.

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
