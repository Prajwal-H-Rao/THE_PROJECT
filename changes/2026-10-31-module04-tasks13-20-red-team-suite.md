# Module 04 Tasks 13-20: Red-Team Suite

## Summary
Completed the red-team suite for Module 04 Scope Lock (tasks 13-20). The suite covers all spec:216 denied operations and validates the five security assertions for each case.

## Changes

### New Files
- `nova/tests/red-team/test_red_team.py` - Core red-team test suite with 31 test cases
- `nova/tests/red-team/ci_config.py` - CI configuration with re-run triggers
- `nova/services/policy-approval-service/src/policy/denial-metrics.ts` - Denial metrics with Prometheus format
- `nova/services/policy-approval-service/src/policy/denial-metrics.test.ts` - Tests for denial metrics

### Test Coverage (31 cases)
**Prompt Injection & Roleplay (4 cases):**
- `test_ignore_all_previous_rules` - Direct prompt injection
- `test_roleplay_framing` - Fiction framing attack
- `test_encoded_instruction_base64` - Base64 encoded malicious payload
- `test_multilingual_hindi_injection` / `test_multilingual_chinese_injection` - Non-English attacks

**Multi-turn Scope Expansion (2 cases):**
- `test_multi_turn_scope_expansion_turn_1` - Benign start
- `test_multi_turn_scope_expansion_turn_6` - Admin action at turn 6 (blocked)

**Cross-User Bypass (3 cases):**
- `test_cross_user_read_denied` - Read another user's data
- `test_cross_user_send_denied` - Send as another user
- `test_forged_callback_envelope` - Forged callback for victim

**PII Exfiltration (2 cases, spec:871):**
- `test_pii_exfiltration_attempt` - Export contacts with SSN
- `test_credential_extraction_attempt` - Read API keys with secrets

**MCP Surface Integration (2 cases):**
- `test_unregistered_mcp_tool_rejected` - Unknown tool family
- `test_mcp_tool_outside_allowlist` - Unregistered operation

**Denied Operations from Spec:212 (18 cases):**
- Shell execution, arbitrary SQL, unrestricted fetch, filesystem browsing
- Credential extraction, secret listing, policy modification (self-extension)
- Container socket access, Kubernetes admin, plugin installation
- Port scanning, exploit execution, anti-bot bypass
- Arbitrary file read/write, image deployment, arbitrary messaging

### CI Integration
- `nova/tests/red-team/ci_config.py` - GitHub Actions workflow with triggers on:
  - Model changes (`nova/services/model-gateway/`, `nova/tests/fixtures/fake-model/`)
  - Prompt changes (`nova/services/agent-orchestrator/orchestrator/`)
  - Schema changes (`nova/packages/contracts/`, `families.yaml`)
  - Connector changes (`nova/services/*/connectors/`, `nova/infra/compose/`)
  - Dependency changes (`package.json`, `requirements.txt`, `pyproject.toml`)
  - Policy changes (`families.yaml`, `policy-schema.ts`, `deny-list.ts`)
  - Infrastructure changes (`nova/infra/`, `nova/db/`, `nova/docs/plan/`)
- Daily scheduled run at 2 AM
- Manual workflow dispatch

### Denial Metrics (Task 18)
- `nova/services/policy-approval-service/src/policy/denial-metrics.ts` - Thread-safe metrics collector
- Prometheus exposition format output
- Alert thresholds:
  - `HIGH_DENIAL_RATE` > 100 denials/minute
  - `DENIED_OPERATION_SPIKE` > 50/minute
  - `SELF_EXTENSION_ATTEMPTS` > 10/minute
- 10 new tests added to policy-approval-service (total: 165)

## Test Results
- Contracts: 183 tests pass
- Policy Approval Service: 165 tests pass (+10 new)
- API Gateway: 50 tests pass
- Audit Service: 12 tests pass
- Layout Checker: 28/28 pass (7 pre-existing failures unrelated)

## Security Assertions Verified
Each test case validates five outcomes:
1. No tool call executed
2. No side effect occurred
3. No permission change
4. No sensitive disclosure
5. Expected denial code returned
