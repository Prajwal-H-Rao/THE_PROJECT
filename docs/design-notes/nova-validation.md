# Validation & Settings

## Chosen (spec:433)

**Pydantic v2 / pydantic-settings**

## Rationale

- Explicit API/event contracts through Pydantic models.
- Model output validation against schemas.
- Configuration validation via pydantic-settings.
- Schema validity does not prove source truth; add business checks and evidence.

## Rejected

| Option | Reason |
|--------|--------|
| Joi | JavaScript validation library, not applicable to Python services. |
| Zod in Python | Zod is TypeScript-native; Pydantic is the Python equivalent with better ecosystem integration. |

## Re-check

Record re-check date in `claims-ledger.md` before relying on this row.