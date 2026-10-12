# Spec coverage

Every heading in `NOVA_Full_Updated_Spec.md` and its module owner. Count verified with the fence-aware command in `README.md`. Result: 74 headings, zero unmapped.

The first module column names the primary owner.

## Coverage table

| Line | Heading | Module |
|---|---|---|
| 1 | NOVA: Self-Hosted Personal AI Agent (title) | `README.md` |
| 8 | Architecture Overview | `01-architecture` |
| 12 | Architectural rules | `01-architecture` |
| 25 | Logical architecture | `01-architecture` |
| 66 | Request lifecycle | `03-agent-runtime` |
| 76 | Service communication | `01-architecture`, `07-identity-authz` |
| 84 | Data Model (Schema Examples) | `02-data-and-audit` |
| 141 | System Components | `01-architecture` |
| 143 | Agent Runtime & Tool Registry | `03-agent-runtime` |
| 167 | Agent workflow and execution policy | `03-agent-runtime`, `08-policy-approval` |
| 175 | Scope Lock, Anti-Jailbreak and Allowed-Task Enforcement | `04-scope-lock` |
| 181 | Allowed task families | `04-scope-lock`, `09-inbox-calendar`, `10-tasks-notes`, `11-finance-trips`, `12-jobs-agent` |
| 195 | Enforcement layers (all required) | `04-scope-lock` |
| 208 | Operations that must never be exposed as agent tools | `04-scope-lock` |
| 212 | Required red-team acceptance suite | `04-scope-lock`, `18-release-gate` |
| 216 | Integrations and External APIs | `09-inbox-calendar`, `11-finance-trips`, `12-jobs-agent` |
| 231 | Security & Access Control | `07-identity-authz` (RBAC roles, HTTPS), `20-pages-and-automations` (admin plane) |
| 241 | UI/UX Design Specification | `15-design-system` |
| 245 | Design tokens (source of truth) | `15-design-system` |
| 279 | CSS tokens | `15-design-system` |
| 314 | Typography | `15-design-system` |
| 334 | Spacing, dimensions and layout | `15-design-system` |
| 362 | Responsive breakpoints | `15-design-system` |
| 366 | Component variants, states and anatomy | `15-design-system` |
| 390 | UI states for agent work | `15-design-system`, `08-policy-approval` |
| 399 | Page-specific composition | Shared shell in `15-design-system`. Today, Assistant, Automations, Integrations, Activity and Settings in `20-pages-and-automations`. Domain pages in `09-inbox-calendar`, `10-tasks-notes`, `11-finance-trips`, `12-jobs-agent` and `13-employer-registry`. |
| 419 | Technology Choices (Comparison) | `19-tech-and-curriculum` |
| 442 | Local Model Strategy: Agentic Tool Calling on Commodity Hardware | `05-model-strategy` |
| 444 | Design objective and recommended starting profile | `05-model-strategy` |
| 450 | Candidate shortlist | `05-model-strategy` |
| 467 | Small-hardware inference repositories | `05-model-strategy` |
| 478 | Recommended development commands | `05-model-strategy` |
| 498 | Agentic and tool-calling protocol | `05-model-strategy`, `03-agent-runtime` |
| 508 | Model evaluation gate | `05-model-strategy` |
| 512 | Resume & Job-Search / Application Agent | `12-jobs-agent` |
| 516 | Flow | `12-jobs-agent` |
| 530 | Data and service responsibilities | `12-jobs-agent`, `13-employer-registry` |
| 543 | Acceptance criteria (jobs) | `12-jobs-agent` |
| 553 | 500-Employer Target Registry and Job-Opening Tracker | `13-employer-registry` |
| 557 | Registry lifecycle | `13-employer-registry` |
| 567 | Permitted source priority and connector policy | `13-employer-registry` |
| 576 | Polling and matching policy | `13-employer-registry` |
| 584 | Data model (illustrative SQL) | `13-employer-registry`, `02-data-and-audit` |
| 628 | Dashboard and service behavior | `13-employer-registry`, `15-design-system` |
| 632 | Acceptance criteria (registry) | `13-employer-registry` |
| 641 | Implementation & Learning Curriculum | `19-tech-and-curriculum` |
| 680 | Curriculum order and practical labs | `19-tech-and-curriculum` |
| 695 | Roadmap & Milestones | `schedule.md` |
| 717 | Microservice Catalogue, Contracts and Ownership | `01-architecture`, all domain modules |
| 747 | Example API and event conventions | `02-data-and-audit` |
| 754 | WhatsApp and Telegram Interaction | `14-channels` |
| 758 | Telegram | `14-channels` |
| 765 | WhatsApp Business Platform / Cloud API | `14-channels` |
| 772 | Chat-based approvals | `14-channels`, `08-policy-approval` |
| 776 | Service Authentication and Authorization Standard | `07-identity-authz` |
| 788 | Authorization matrix (minimum expected defaults) | `07-identity-authz` |
| 803 | Sandboxed ML and Document Processing | `06-document-ml-sandbox` |
| 807 | Trust boundaries | `06-document-ml-sandbox` |
| 816 | Defenses against fabricated output and prompt injection | `06-document-ml-sandbox`, `04-scope-lock` |
| 827 | Minimum container controls | `17-deployment-hardening` |
| 833 | Kubernetes controls | `17-deployment-hardening` |
| 850 | Reliability, Failure Handling and Recovery | `16-reliability-testing` |
| 859 | Testing, Observability and Audit Contract | `16-reliability-testing` |
| 861 | Required test layers | `16-reliability-testing` |
| 872 | Audit event schema | `02-data-and-audit` |
| 905 | Observability | `16-reliability-testing` |
| 909 | Repository and Local Deployment Layout | `01-architecture` |
| 972 | Source and Design Notes | `19-tech-and-curriculum` |
| 976 | References | `claims-ledger.md` |
| 1010 | Non-Negotiable Security Invariants (Release Gate) | `18-release-gate` |
| 1026 | Appendix B — Seed Employer List (500) | `13-employer-registry` |
| 1030 | India-focused target employers (IN-001 to IN-250) | `13-employer-registry` |
| 1283 | International and global target employers | `13-employer-registry` |
| 1536 | Seed-list maintenance rules | `13-employer-registry` |

## Data sections

Four headings hold data, not prose. Do not copy the rows into a plan file. Reference the artifact and test the import.

| Heading | Artifact | Check |
|---|---|---|
| India-focused target employers | `NOVA_Employer_Targets_500.csv` | 250 rows, region `IN`, unique `normalized_name` |
| International and global target employers | `NOVA_Employer_Targets_500.csv` | 250 rows, region `GLOBAL`, unique `normalized_name` |
| Design tokens (source of truth) | Spec table, 25 token rows | Both themes built from the same keys |
| CSS tokens | Spec code block, 32 lines | Copied verbatim into the design system |

## Unheaded spec content

| Content | Line | Owner |
|---|---|---|
| Revision date | 3 | `19-tech-and-curriculum` |
| Revision note (supersedes modular monolith and FastAPI) | 1007 | `19-tech-and-curriculum` |
| Status | 4 | `README.md` |
| Executive Summary | 6 | `README.md` |
| Suggested delivery gates A to G | 713 | `schedule.md`, `18-release-gate` |
| Evaluation metrics | 715 | `schedule.md` |
| Compose local layout rules | 970 | `01-architecture`, `17-deployment-hardening` |
| Audit redaction rules | 903 | `02-data-and-audit`, `16-reliability-testing` |
| 4K context rule and docker.sock ban on the model container | 496 | `05-model-strategy` |
| Kubernetes acceptance gate | 847 | `17-deployment-hardening` |
| Appendix B preamble (list is not a ranking) | 1028 | `13-employer-registry` |
| Optional cloud lab rule | 691, 710 | `schedule.md` (deferred, with reason) |
