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
| 67 | Request lifecycle | `03-agent-runtime` |
| 77 | Service communication | `01-architecture`, `07-identity-authz`, `21-mcp-surface` |
| 86 | Data Model (Schema Examples) | `02-data-and-audit` |
| 143 | System Components | `01-architecture` |
| 145 | Agent Runtime, MCP Surface & Tool Catalogue | `03-agent-runtime`, `21-mcp-surface` |
| 169 | Agent workflow and execution policy | `03-agent-runtime`, `08-policy-approval` |
| 177 | Scope Lock, Anti-Jailbreak and Allowed-Task Enforcement | `04-scope-lock` |
| 183 | Allowed task families | `04-scope-lock`, `09-inbox-calendar`, `10-tasks-notes`, `11-finance-trips`, `12-jobs-agent`, `21-mcp-surface` |
| 197 | Enforcement layers (all required) | `04-scope-lock` |
| 210 | Operations that must never be exposed as agent tools | `04-scope-lock` |
| 214 | Required red-team acceptance suite | `04-scope-lock`, `18-release-gate` |
| 218 | Integrations and External APIs | `09-inbox-calendar`, `11-finance-trips`, `12-jobs-agent` |
| 233 | Security & Access Control | `07-identity-authz` (RBAC roles, HTTPS), `20-pages-and-automations` (admin plane), `21-mcp-surface` (MCP server checks) |
| 243 | UI/UX Design Specification | `15-design-system` |
| 247 | Design tokens (source of truth) | `15-design-system` |
| 281 | CSS tokens | `15-design-system` |
| 316 | Typography | `15-design-system` |
| 336 | Spacing, dimensions and layout | `15-design-system` |
| 364 | Responsive breakpoints | `15-design-system` |
| 368 | Component variants, states and anatomy | `15-design-system` |
| 392 | UI states for agent work | `15-design-system`, `08-policy-approval` |
| 401 | Page-specific composition | Shared shell in `15-design-system`. Today, Assistant, Automations, Integrations, Activity and Settings in `20-pages-and-automations`. Domain pages in `09-inbox-calendar`, `10-tasks-notes`, `11-finance-trips`, `12-jobs-agent` and `13-employer-registry`. |
| 421 | Technology Choices (Comparison) | `19-tech-and-curriculum` |
| 445 | Local Model Strategy: Agentic Tool Calling on Commodity Hardware | `05-model-strategy` |
| 447 | Design objective and recommended starting profile | `05-model-strategy` |
| 453 | Candidate shortlist | `05-model-strategy` |
| 470 | Small-hardware inference repositories | `05-model-strategy` |
| 481 | Recommended development commands | `05-model-strategy` |
| 501 | Agentic and tool-calling protocol | `05-model-strategy`, `03-agent-runtime`, `21-mcp-surface` |
| 511 | Model evaluation gate | `05-model-strategy` |
| 515 | Resume & Job-Search / Application Agent | `12-jobs-agent` |
| 519 | Flow | `12-jobs-agent` |
| 533 | Data and service responsibilities | `12-jobs-agent`, `13-employer-registry` |
| 546 | Acceptance criteria (jobs) | `12-jobs-agent` |
| 556 | 500-Employer Target Registry and Job-Opening Tracker | `13-employer-registry` |
| 560 | Registry lifecycle | `13-employer-registry` |
| 570 | Permitted source priority and connector policy | `13-employer-registry` |
| 579 | Polling and matching policy | `13-employer-registry` |
| 587 | Data model (illustrative SQL) | `13-employer-registry`, `02-data-and-audit` |
| 631 | Dashboard and service behavior | `13-employer-registry`, `15-design-system` |
| 635 | Acceptance criteria (registry) | `13-employer-registry` |
| 644 | Implementation & Learning Curriculum | `19-tech-and-curriculum` |
| 683 | Curriculum order and practical labs | `19-tech-and-curriculum`, `21-mcp-surface` |
| 699 | Roadmap & Milestones | `README.md`, `18-release-gate` |
| 721 | Microservice Catalogue, Contracts and Ownership | `01-architecture`, all domain modules |
| 751 | Example API and event conventions | `02-data-and-audit` |
| 758 | WhatsApp and Telegram Interaction | `14-channels` |
| 762 | Telegram | `14-channels` |
| 769 | WhatsApp Business Platform / Cloud API | `14-channels` |
| 776 | Chat-based approvals | `14-channels`, `08-policy-approval` |
| 780 | Service Authentication and Authorization Standard | `07-identity-authz` |
| 792 | Authorization matrix (minimum expected defaults) | `07-identity-authz` |
| 807 | Sandboxed ML and Document Processing | `06-document-ml-sandbox` |
| 811 | Trust boundaries | `06-document-ml-sandbox` |
| 820 | Defenses against fabricated output and prompt injection | `06-document-ml-sandbox`, `04-scope-lock` |
| 831 | Minimum container controls | `17-deployment-hardening` |
| 837 | Kubernetes controls | `17-deployment-hardening` |
| 854 | Reliability, Failure Handling and Recovery | `16-reliability-testing` |
| 863 | Testing, Observability and Audit Contract | `16-reliability-testing` |
| 865 | Required test layers | `16-reliability-testing` |
| 876 | Audit event schema | `02-data-and-audit` |
| 909 | Observability | `16-reliability-testing` |
| 913 | Repository and Local Deployment Layout | `01-architecture` |
| 976 | Source and Design Notes | `19-tech-and-curriculum` |
| 980 | References | `claims-ledger.md` |
| 1014 | Non-Negotiable Security Invariants (Release Gate) | `18-release-gate` |
| 1030 | Appendix B — Seed Employer List (500) | `13-employer-registry` |
| 1034 | India-focused target employers (IN-001 to IN-250) | `13-employer-registry` |
| 1287 | International and global target employers | `13-employer-registry` |
| 1540 | Seed-list maintenance rules | `13-employer-registry` |

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
| Revision note (supersedes modular monolith and FastAPI) | 1011 | `19-tech-and-curriculum` |
| Status | 4 | `README.md` |
| Executive Summary | 6 | `README.md` |
| Suggested delivery gates A to G | 717 | `README.md`, `18-release-gate` |
| Evaluation metrics | 719 | `order-and-constraints.md`, `18-release-gate` |
| Compose local layout rules | 974 | `01-architecture`, `17-deployment-hardening` |
| Audit redaction rules | 907 | `02-data-and-audit`, `16-reliability-testing` |
| 4K context rule and docker.sock ban on the model container | 499 | `05-model-strategy` |
| Kubernetes acceptance gate | 851 | `17-deployment-hardening` |
| Appendix B preamble (list is not a ranking) | 1032 | `13-employer-registry` |
| Optional cloud lab rule | 694, 714 | `order-and-constraints.md` (deferred, with reason) |
