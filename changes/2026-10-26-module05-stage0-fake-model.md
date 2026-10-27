# 2026-10-26: Module 05 Stage 0 — Model Registry and Fake Model

## Summary
Completed Stage 0 of Module 05 (Model Strategy and Local Inference) as part of the Module 03 unblocking work. Created the model registry, setup script, deterministic fake model, and validation tests.

## Changes

### Models Directory (`nova/models/`)
- **setup.sh**: Pulls and pins Ollama model digests; supports `--from-manifest` for offline verification and `--verify-only` for CI
- **model-registry.yaml**: Single source of truth for model configuration at spec:961
  - 6 model rows: qwen3.5 0.8b/2b/4b/9b, bge-small-en-v1.5, multilingual-e5-small
  - 12-hex digest prefixes from ollama.com tag pages
  - `router_role: classifier_only|planner` for tier enforcement
  - Status tracking: `pending_pin` (unverified) vs `pinned` (verified)
  - Routing policy block mapping 7 canonical families to tiers
  - CI fake model row (`nova-fake-model`) with `ci_only: true`

### Fake Model Fixtures (`nova/tests/fixtures/fake-model/`)
- **fake_model.py**: Deterministic scriptable fake model implementing the MCP tool-call contract
  - 6 test scenarios: happy_path, wrong_tool, invalid_args, out_of_scope, injection, multi_turn
  - Returns valid tool calls matching the MCP catalogue
  - Deterministic idempotency keys for approval-required tools
  - Used by Module 05 task 14 (CI default) and Module 03 task 15 (orchestrator tests)
- **test_fake_model.py**: 8 tests covering all scenarios + idempotency determinism

### Model Registry Tests (`nova/models/test_model_registry.py`)
- Validates registry structure, model rows, classifier_only/planner roles
- Verifies routing policy has all 7 canonical families
- Checks digest format (12-hex for pending_pin, 64-hex for pinned)

### Layout Updates
- Tree counts updated: 120 directories, 82 leaves, 37 placeholders
- Updated `repo.md`, `nova/docs/layout-diff.md`, `nova/tests/layout/tree_checks.py`

## Testing
- Fake model: 8/8 tests pass
- Model registry: 6/6 tests pass  
- Contracts: 173/173 tests pass
- Policy-approval-service: 122/122 tests pass
- Audit-service: 12/12 tests pass
- API-gateway: 50/50 tests pass
- Layout checker: 28/28 checks pass

## Files Added
- `nova/models/setup.sh`
- `nova/models/model-registry.yaml`
- `nova/models/test_model_registry.py`
- `nova/tests/fixtures/fake-model/fake_model.py`
- `nova/tests/fixtures/fake-model/test_fake_model.py`

## Files Modified
- `nova/tests/layout/tree_checks.py` (counts)
- `repo.md` (tree counts)
- `nova/docs/layout-diff.md` (tree counts)