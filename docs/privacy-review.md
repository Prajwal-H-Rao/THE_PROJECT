# Privacy, AI, Employment and Messaging Review

## Scope

This document records the jurisdictional review for NOVA's data retention periods.
Per spec:239 and spec:231, every retention period must cite this review.
No retention period is set without it.

## Jurisdiction

Primary: **Germany (EU GDPR, BDSG)**
Secondary: **Global** (users may reside anywhere; GDPR applies extraterritorially)

## Review Date

2026-10-23

## Legal Bases by Data Category

### 1. Identity and Authentication Data
| Data | Retention | Legal Basis |
|------|-----------|-------------|
| `users` (email, display_name, avatar) | Account lifetime + 30 days | Art. 6(1)(b) GDPR (contract) |
| `sessions` (session_id, csrf_token) | Session expiry + 7 days | Art. 6(1)(f) GDPR (legitimate interest: security) |
| `channel_identities` (provider linkage) | Account lifetime + 30 days | Art. 6(1)(a) GDPR (consent) + Art. 6(1)(b) |

### 2. Communications Data
| Data | Retention | Legal Basis |
|------|-----------|-------------|
| `emails` (message_id, thread, body, attachments) | 3 years after last activity | Art. 6(1)(b) + Art. 17(3)(b) GDPR (legal claims) |
| `events` (calendar entries) | 3 years after event end | Art. 6(1)(b) |
| `tasks` (titles, descriptions, due dates) | 3 years after completion | Art. 6(1)(b) |

### 3. Knowledge and Notes Data
| Data | Retention | Legal Basis |
|------|-----------|-------------|
| `notes` (content, vectors, tags) | Account lifetime + 30 days | Art. 6(1)(a) (consent) |
| `content_vector` (pgvector embeddings) | Same as parent note | Art. 6(1)(a) |

### 4. Financial Data
| Data | Retention | Legal Basis |
|------|-----------|-------------|
| `finances` (amounts, categories, receipts) | 10 years (German HGB §257, AO §147) | Art. 6(1)(c) GDPR (legal obligation) |
| `retention_policies` (policy definitions) | Policy lifetime + 10 years | Art. 6(1)(c) |

### 5. Travel Data
| Data | Retention | Legal Basis |
|------|-----------|-------------|
| `trips` (itineraries, tickets) | 3 years after trip end | Art. 6(1)(b) |
| `itinerary_ref` (object store pointers) | Same as parent trip | Art. 6(1)(b) |

### 6. Employment and Job Search Data
| Data | Retention | Legal Basis |
|------|-----------|-------------|
| `resume_profile` (versions, skills, experience) | Account lifetime + 30 days | Art. 6(1)(a) (consent) |
| `job_listing` (fingerprinted listings) | 2 years after posting | Art. 6(1)(f) (legitimate interest: market analysis) |
| `job_match` (scores, reasoning) | 2 years | Art. 6(1)(f) |
| `application_draft` | 1 year after last update | Art. 6(1)(b) |
| `application_submission` (confirmations) | 3 years after submission | Art. 6(1)(b) + Art. 17(3)(b) |

### 7. Employer Registry Data
| Data | Retention | Legal Basis |
|------|-----------|-------------|
| `employer_targets` (names, domains, status) | 5 years after last verification | Art. 6(1)(f) |
| `employer_job_sources` (selectors, schedules) | Source lifetime + 1 year | Art. 6(1)(f) |
| `job_opening` (fingerprinted openings) | 2 years after close | Art. 6(1)(f) |
| `job_source_run` (run metadata) | 2 years | Art. 6(1)(f) |

### 8. Policy and Approval Data
| Data | Retention | Legal Basis |
|------|-----------|-------------|
| `approvals` (payload_hash, status) | 3 years after decision | Art. 6(1)(c) + Art. 17(3)(b) |
| `policy_decisions` (results, reasons) | 3 years | Art. 6(1)(c) |

### 9. Audit Data
| Data | Retention | Legal Basis |
|------|-----------|-------------|
| `audit_log` (all columns) | 7 years (German HGB §257, GoBD) | Art. 6(1)(c) + Art. 17(3)(b) |
| Hash chain integrity | Permanent (tamper evidence) | Art. 32 GDPR (security) |

### 10. Queue and Event Data
| Data | Retention | Legal Basis |
|------|-----------|-------------|
| `queue_outbox` (events) | 30 days after processing | Art. 6(1)(f) |
| `event_receipts` (deduplication) | 30 days | Art. 6(1)(f) |

## AI and Automated Decision-Making

- **Resume profiling / job matching**: Scores and reasoning stored in `job_match`. No fully automated decisions with legal effect (human reviews all applications). Art. 22 GDPR not triggered.
- **Document parsing / extraction**: Evidence-linked fields only. No automated decisions on financial/legal matters.
- **Vector embeddings**: Used for semantic search only. Not used for profiling or automated decisions.

## Employment Law (German)

- Bewerberdatenschutz (BDSG §26): Application data retained max 6 months after rejection unless consent for longer.
- Our `application_submission` retention (3 years) exceeds this; requires explicit consent at submission time.
- `job_match` scores are internal only; not shared with employers.

## Messaging and Channel Data

- **Telegram/WhatsApp**: Message content not stored by NOVA (only metadata via webhook). Webhook payloads processed and discarded.
- **Email (Gmail)**: Full message stored in `emails` with 3-year retention. User can delete anytime (triggers deletion workflow, task 13).
- Channel identity linkage: Consent-based, revocable.

## Retention Policy Table Seeding

The `finance_service.retention_policies` table is seeded by migration with rows citing this document:

```sql
INSERT INTO finance_service.retention_policies (resource_type, resource_id, retention_period, legal_basis, review_date) VALUES
  ('finances', NULL, '10 years', 'HGB §257, AO §147; docs/privacy-review.md §4', '2027-10-23'),
  ('notes', NULL, 'account lifetime + 30 days', 'GDPR Art. 6(1)(a); docs/privacy-review.md §3', '2027-10-23'),
  ('emails', NULL, '3 years after last activity', 'GDPR Art. 6(1)(b); docs/privacy-review.md §2', '2027-10-23'),
  ('events', NULL, '3 years after event end', 'GDPR Art. 6(1)(b); docs/privacy-review.md §2', '2027-10-23'),
  ('trips', NULL, '3 years after trip end', 'GDPR Art. 6(1)(b); docs/privacy-review.md §5', '2027-10-23'),
  ('audit_log', NULL, '7 years', 'HGB §257, GoBD; docs/privacy-review.md §9', '2027-10-23');
```

## Review Schedule

- Next review: **2027-10-23** (12 months)
- Trigger for early review: New jurisdiction, new data category, regulatory guidance change.

## Sign-off

This review authorizes the retention periods encoded in migration 07 (finance schema) and the `retention_policies` table. No retention period in the NOVA schema is valid without a corresponding row in this review.

---
*Generated by Module 02 task 12. Update on every jurisdictional change.*