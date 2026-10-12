# Module 15 — Design system

Phase P5. Spec headings: UI/UX design, design tokens, CSS tokens, typography, spacing, breakpoints, component states, agent states, page composition.

## Goal

One token file drives both themes. Every component carries all of its specified states. Every agent action shows an honest state. Page bodies belong to their domain modules, so this module ships the shell and the shared parts only.

## Constraints (spec, binding)

- Spec:243: "Use the same tokens for the web dashboard and approval surfaces shown in chat."
- Spec:247: "Do not hard-code per-page hex values when a semantic token exists."
- Spec:277: "Status must not be encoded with color alone: pair status colors with text, icon and/or label."
- Spec:277: WCAG 2.2 AA means "at least 4.5:1 for normal text, 3:1 for large text and meaningful non-text components."
- Spec:336: "Base spacing unit is **4px**."
- Spec:364: "Chat must stay usable at 320px width. Never hide approval details, job-fit factors, or security context to fit a narrow screen."
- Spec:388: "Do not treat a Lighthouse score as a substitute for manual review."
- Spec:417: "The design tokens are design recommendations to verify in the final Figma implementation, not claims that the Figma file was edited."
- Spec:397: "each module implements each applicable state rather than a blank page or fake sample data" for empty, loading, offline and permission-denied.

## Design token set (spec:251-275, 25 rows)

Dark and light values are both specified. Copy them; do not invent new keys.

`--nova-bg`, `--nova-bg-sidebar`, `--nova-surface-1`, `--nova-surface-2`, `--nova-surface-3`, `--nova-text`, `--nova-text-muted`, `--nova-text-subtle`, `--nova-border`, `--nova-border-strong`, `--nova-primary`, `--nova-primary-hover`, `--nova-on-primary`, `--nova-secondary`, `--nova-success`, `--nova-warning`, `--nova-danger`, `--nova-info`, `--nova-pending`, `--nova-focus-ring`, `--nova-overlay`, `--nova-chart-1`, `--nova-chart-2`, `--nova-chart-3`, `--nova-chart-4`.

The CSS block at spec:282-311 adds radii `--nova-radius-xs/sm/md/lg/xl/pill` and shadows `--nova-shadow-sm/md/lg`. Spacing keys are `space-0` to `space-20` on a 4px base, not CSS custom properties in the block. Fonts are Inter and JetBrains Mono (spec:316).

## Agent UI states (spec:392-397)

Planning, Approval required, Executing, Verified success, Failed/uncertain, and Empty/loading/offline/permission-denied. Six states, not four.

## Build sequence

| # | Task | Artifact | Test | Hrs |
|---|---|---|---|---|
| 1 | Copy the CSS token block from spec:282-311 verbatim | `apps/web/styles/tokens.css` | Diff against the spec block is empty | 3 |
| 2 | Build the theme switch with persistence and system preference | web app | Both themes render from the same keys | 4 |
| 3 | Implement the 25-row token table as a typed token file | `tokens.ts` | Typed file has exactly 25 color keys | 4 |
| 4 | Implement typography: Inter for UI, JetBrains Mono for IDs and code | `typography.css` | Long-word overflow passes | 4 |
| 5 | Implement spacing on the 4px base and the layout dimension table | `spacing.css` | No hard-coded pixel spacing | 4 |
| 6 | Build Button with all variants and states: default, hover, active, focus-visible, loading, disabled | `components/Button/` | Focus-visible present on every control | 5 |
| 7 | Build TextField, TextArea, Select, Combobox with invalid, read-only and no-results states | `components/` | `aria-describedby` links the error | 8 |
| 8 | Build Card, Badge, Tabs, Dialog, Drawer, DataTable, Timeline with specified states | `components/` | Dialog traps focus and closes safely | 9 |
| 9 | Build ChatMessage, ApprovalCard, FileDropzone, EmptyState, Skeleton, Toast, DatePicker | `components/` | ApprovalCard shows hash, expiry and consequence | 9 |
| 10 | Build the 10 domain card variants: email, event, task, note, transaction, trip, job, application, approval, document | `components/cards/` | Each renders every listed state | 8 |
| 11 | Implement all six agent UI states with honest copy | `components/agent-states/` | No `done` renders before verification | 6 |
| 12 | Build the action preview: target, exact fields, permissions, side effects, reversibility, expiry, policy rationale | `components/ActionPreview/` | Preview equals the executed payload | 7 |
| 13 | Add approval, rejection, edit and expiry outcomes, keyboard reachable | ActionPreview | Full flow works without a mouse | 6 |
| 14 | Implement responsive layouts at 640, 768, 1024, 1280 and 1536, plus 320 for chat | layouts | Screenshot tests at each width | 7 |
| 15 | Build the app shell: navigation, command palette, user menu, theme, status, audit link | `apps/web/shell/` | Navigation is keyboard reachable | 7 |
| 16 | Add reduced-motion and high-contrast support | global styles | Preference changes take effect | 4 |
| 17 | Run an accessibility pass: contrast, labels, focus order, ARIA, keyboard, hit targets 40-44px | `a11y-report.json` | The report lists zero violations of severity critical, and every entry carries an element selector | 7 |
| 18 | Add the empty, loading, offline and permission-denied state for every shared component | components | Each state renders, none shows fake data | 5 |

This build sequence sums to 107 hours.

## Build order

Work these steps in order. A step names tasks from the table above. At 30 hours per week a phase spans several weeks, so a step may run into the next week.

1. Copy the CSS tokens and build the theme switch.
2. Build Button and TextField with every state, then the action preview.
3. Run the accessibility crawl before any domain page starts.

## Acceptance tests

- `test_token_diff_empty` — `tokens.css` matches spec:282-311 byte for byte.
- `test_typed_token_file_has_25_keys` — the count is 25, not 24 or 26.
- `test_spacing_base_is_4px` — every spacing value is a multiple of 4.
- `test_focus_visible_on_every_control` — a crawl finds no interactive element without `:focus-visible`.
- `test_status_not_color_alone` — each status carries an icon or a text label.
- `test_no_unverified_done` — the success state never renders before the verifier passes.
- `test_action_preview_equals_execution` — the previewed payload matches what runs.
- `test_approval_keyboard_reachable` — approve, reject, edit and expire all work without a mouse.
- `test_chat_usable_at_320px` — approval details stay visible at 320px.
- `test_contrast_meets_wcag_aa` — the scan reports no normal-text ratio below 4.5:1 and no large-text ratio below 3:1.

## Risks

- The spec states the tokens are recommendations, not a measured Figma export. Measure contrast in the built UI and record the result (see `claims-ledger.md` open claims).
- Page bodies belong to modules 09, 10, 11, 12, 13 and 20. Do not absorb them here or this module will blow past 200 lines.
- Accessibility is cheapest when built in. Run the crawl after every component batch, not once at the end.
