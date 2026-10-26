# BLOCKING OBJECTIONS — v4 Plan Review

**Round:** 4 (continued)  
**Scope:** Independent verification of v4 plan against existing implementation  
**Verdict:** **BLOCKED** — 11 blocking objections found

---

## 1. 200-LINE RULE VIOLATIONS

| File | Lines | Status |
|------|-------|--------|
| `services/policy-approval-service/src/policy/families.yaml` | **239** | **EXCEEDS 200** |
| `packages/contracts/mcp/call.ts` | 233 | EXCEEDS 200 |
| `packages/contracts/mcp/audit.ts` | 247 | EXCEEDS 200 |
| `packages/contracts/mcp/tool.ts` | 190 | Near limit |

**Evidence:** `wc -l` output above.  
**Plan claim:** "per-family catalogue files <200 lines" and "canonical 7 families".  
**Reality:** Single `families.yaml` holds all 7 families at 239 lines. MCP contract files also exceed 200 lines. No split declared in plan.

---

## 2. PLAN TASK-ROW OWNERSHIP GAPS

`tree_checks.py` reads backticked paths **only from build-sequence TABLE rows**. The following v4 artifacts have **no owning plan row**:

| Artifact | Plan Reference | Actual Owner | Gap |
|----------|---------------|--------------|-----|
| `models/setup.sh` | 05-model-strategy task 1 | `models/setup.sh` backticked ✓ | **Directory `models/` does not exist** — tree check will fail on missing dir |
| `models/model-registry.yaml` | 05-model-strategy task 2 | `models/` backticked | Same — directory missing |
| `contracts/mcp/catalogue/*.json` (per-family) | 21-mcp-surface tasks 1,6 | `packages/contracts/mcp/` only | No row names per-family catalogue files |
| `contracts/mcp/service_token.py` (Python mirror) | Stage A | **None** | No plan row for Python mirrors |
| `tests/fixtures/fake-model/` | 05-model-strategy task 14 | `tests/fixtures/` | Directory missing; 03-agent-runtime task 15 also claims it — conflict |
| `tests/fixtures/mcp-parity/` | Stage A | **None** | No plan row |
| `services/agent-orchestrator/mcp-client/` | 21-mcp-surface task 4 | `services/agent-orchestrator/mcp-client/` | Directory is stub (`.gitkeep` only) — tree check expects files |
| Guard files in `policy-approval-service/src/**/*guard*` | 21-mcp-surface task 5 | `services/policy-approval-service/` | No row names guard files; v4 adds them |
| Migration adding `policy_version` + `dedupe_key` COALESCE into hash | 02-data-and-audit task 4 | Audit schema only | No row for this specific migration |

**Result:** `tree_checks.py` will reject these as "undeclared files" or fail on missing directories.

---

## 3. MISSING JWT GUARDS ON POLICY/AUDIT NESTJS ENDPOINTS

**Policy-approval-service** (`src/main.ts`, `src/app.module.ts`):  
- No `Guards`, no `@UseGuards`, no JWT verification on `/policy/decide`, `/policy/decide/bulk`, `/policy/grants*`, `/policy/version*`
- Accepts unauthenticated calls — **fails closed only if secret empty** (not the same as auth)

**Audit-service** (`src/audit.controller.ts`, `src/main.ts`):  
- `/audit/record` and `/audit/records` have **zero authentication**
- Only validation: `BadRequestException` for missing fields

**v4 plan requirement:** "NestJS guards, JWT guards on policy/audit"  
**Impact:**  
- Existing tests (e.g., `policy-decision.service.test.ts`) call endpoints directly — **will break** without token fixtures  
- `labs.yml` curls `:8001` (policy service port) — would 401 without fixture tokens  
- No service-token verification middleware imported in either service

**Evidence:** `grep -r "Guard\|verifyToken\|service-auth" nova/services/policy-approval-service/src` → no matches. Same for audit-service.

---

## 4. TOOLDEFINITION BREAKAGE — **CLEARED**

`grep -r "ToolDefinition\|validate_tool" nova/services/api-gateway` → **no matches**.  
API gateway does not import/validate MCP tool definitions. ✅ Not a blocker.

---

## 5. FAMILIES.YAML MIGRATION RULE IDs & SCOPES

**Current state (families.yaml:239 lines):** 7 canonical families ✓ (inbox, calendar, tasks, finance, trips, jobs, channels)  
**Rule IDs:** Unique per family (e.g., `inbox.read`, `calendar.read`) ✓  
**Unknown field rejection:** `validatePolicyRule` in `policy-schema.ts:101-120` rejects extra keys ✓  

**Blocking issues:**  
- v4 plan mentions "adding rules with new scopes (notes:search etc.)" — **no `notes` family exists**; notes operations are under `tasks` family (scope `tasks:read`/`tasks:write`)  
- RBAC migration is **`23-rbac-roles.sql`** (not 17) — creates roles only, **no scopes**  
- Scopes in `16-scopes.sql` are **OAuth integration scopes** (google/gmail/calendar), not policy scopes  
- Policy scopes in families.yaml (e.g., `inbox:read`, `finance:import`) are **not backed by DB grants** — policy service checks `request.scope` string match only, no `user_has_scope` call

**Risk:** New rules with scopes like `notes:search` would have no RBAC enforcement and no migration to create them.

---

## 6. LANGGRAPH SQLITESAVER LOCKING — FUTURE DAY-ONE FAILURE

**v4 Stage B:** "Python router/gateway/orchestrator (decide node no-refetch, interrupt on needs_approval+step_up, bounds 6/5/30s per-call/remaining-budget, verifier→evidence store, workflow.transition audit with extended enums + 8 spec states, dedupe_key+zero-row handled, fake provider row, cancellation, MCP client, TS server library + stub registry tests, Flask boundary with token verify)"

**Known issue:** LangGraph's `SqliteSaver` uses a single SQLite file. **Multiple pytest processes** (CI runs tests in parallel) **will deadlock** on `sqlite3.OperationalError: database is locked`.  
**Mitigation required:** `:memory:` per test, or `tmp_path` per process, or `check_same_thread=False` with WAL mode.  
**Not addressed in plan.** Will surface first CI run.

---

## 7. AUDIT CHAIN CONTRACT MISMATCH

### 7.1 ExecutionStatus enum too narrow
**Spec (03-agent-runtime.md:20):** 8 states — `planned`, `awaiting_approval`, `approved`, `executing`, `succeeded`, `failed`, `cancelled`, `needs_manual_action`  
**audit-contracts.ts:5:** `ExecutionStatus = "pending" | "succeeded" | "failed" | "compensated"` — **4 values only**  
**MCP audit.ts:37:** Same 4 values  
**03-audit-schema.sql:18:** DB column allows any TEXT, but check constraint only guards `succeeded` → `verification_type <> 'none'`

**Result:** Orchestrator emitting `planned`/`awaiting_approval`/etc. will **fail validation** in `validate_mcp_audit_event` / `AuditRecordInput`.

### 7.2 In-memory repo violates check constraint
`audit-repository.ts:43,44,60,61` defaults:
```typescript
executionStatus: input.executionStatus ?? "succeeded",
verificationType: input.verificationType ?? "none",
```
**This produces `succeeded` + `none`** — **violates DB check constraint** `audit_log_succeeded_requires_evidence` (03-audit-schema.sql:41-46). SQL repo relies on trigger; in-memory repo bypasses it. Tests using `InMemoryAuditRepository` pass invalid state.

### 7.3 `compute_row_hash` — OK
`CREATE OR REPLACE FUNCTION` in 03-audit-schema.sql:50 ✓  
`runner.ts` applies in order ✓

---

## 8. FAKE PROVIDER ROW / GATEWAY CONFIG — NOT IMPLEMENTED

**v4 Stage 0:** `models/model-registry.yaml(pending_pin 12hex, router_role, routing policy)`  
**v4 Stage A:** "reject unlisted model with fake provider row"  
**Reality:**  
- `models/` directory **does not exist**  
- `model-registry.yaml` **does not exist**  
- No gateway config validation for model digests  
- No "fake provider row" in any fixture

**Day-one failure:** Gateway starts, reads empty/non-existent registry, either allows all models or crashes on missing file.

---

## 9. CI WORKFLOW MISSING POLICY-APPROVAL-SERVICE & AUDIT-SERVICE BUILDS

**ci.yml** builds/tests:
- ✅ contracts
- ✅ api-gateway
- ✅ Python/TypeScript templates

**Missing:**
- ❌ `policy-approval-service` (has `npm test`, 8 test files)
- ❌ `audit-service` (has `audit-repository.test.ts`)

**Evidence:** `grep "policy-approval\|audit-service" .github/workflows/ci.yml` → no matches.

**Result:** Broken code in these services **will not be caught** until manual run.

---

## 10. AUDIT REPOSITORY DEFAULTS VIOLATE DB CONSTRAINT

**File:** `services/audit-service/src/audit-repository.ts:43,44,60,61,132,133,149,150`  
**Code:**
```typescript
executionStatus: input.executionStatus ?? "succeeded",
verificationType: input.verificationType ?? "none",
```
**DB constraint (03-audit-schema.sql:41-46):**
```sql
CHECK (execution_status <> 'succeeded' OR verification_type <> 'none')
```
**Conflict:** Default path produces forbidden combination. SQL trigger computes hash **after** insert, but constraint checked **before**. Insert will fail in Postgres. In-memory repo silently allows it — tests diverge from production.

---

## 11. PYTEST SUITES ORDER — REQUIREMENTS BEFORE MYPY

**ci.yml:30** installs `ruff==0.17.1 mypy==2.4.0` globally  
**ci.yml:41** runs `mypy nova` **before** `ci.yml:45` installs Python service requirements  
**Impact:** If any Python service (currently only template) has imports from its requirements, mypy will report missing stubs.  
**Current state:** Template service imports only stdlib + pinned deps — may pass, but **order violates "requirements before mypy"** principle in v4 plan.

---

## SUMMARY

**BLOCKED: 11 objections**

1. **200-line rule** — 4 files exceed/near limit, no split declared
2. **Plan ownership** — 9 artifact paths lack owning plan rows; `models/` dir missing
3. **Missing JWT guards** — policy/audit services wide open; tests/labs will break
4. **ToolDefinition** — ✅ cleared
5. **Families.yaml scopes** — notes family missing; policy scopes not DB-backed; RBAC migration misidentified
6. **LangGraph SqliteSaver** — parallel test locking not mitigated
7. **Audit enum mismatch** — 4 vs 8 states; in-memory repo violates constraint
8. **Fake provider row** — models/ dir and registry.yaml absent
9. **CI missing services** — policy-approval & audit not built/tested
10. **Audit repo defaults** — produce forbidden `succeeded`+`none` combo
11. **CI order** — mypy runs before requirements install

**Recommendation:** Do not proceed to implementation. Resolve ownership gaps in plan files, split oversized files, add guards with test fixtures, align audit enums, create models/ directory with registry, wire CI for all services, fix audit repo defaults.