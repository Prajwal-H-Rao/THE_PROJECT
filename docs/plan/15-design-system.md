# Module 15 — Design system

Phase P4. Spec headings: UI/UX design, design tokens, CSS tokens, typography, spacing, breakpoints, component states, agent states, page composition.

## Goal

One token file drives both themes. Every component carries all of its specified states. Every agent action shows an honest state. Page bodies belong to their domain modules, so this module ships the shell and the shared parts only.

## Constraints (spec, binding)

- Spec:245: "Use the same tokens for the web dashboard and approval surfaces shown in chat."
- Spec:249: "Do not hard-code per-page hex values when a semantic token exists."
- Spec:279: "Status must not be encoded with color alone: pair status colors with text, icon and/or label."
- Spec:279: WCAG 2.2 AA means "at least 4.5:1 for normal text, 3:1 for large text and meaningful non-text components."
- Spec:338: "Base spacing unit is **4px**."
- Spec:366: "Chat must stay usable at 320px width. Never hide approval details, job-fit factors, or security context to fit a narrow screen."
- Spec:390: "Do not treat a Lighthouse score as a substitute for manual review."
- Spec:419: "The design tokens are design recommendations to verify in the final Figma implementation, not claims that the Figma file was edited."
- Spec:399: "each module implements each applicable state rather than a blank page or fake sample data" for empty, loading, offline and permission-denied.

## Design token set (spec:253-277, 25 rows)

Dark and light values are both specified. Copy them; do not invent new keys.

`--nova-bg`, `--nova-bg-sidebar`, `--nova-surface-1`, `--nova-surface-2`, `--nova-surface-3`, `--nova-text`, `--nova-text-muted`, `--nova-text-subtle`, `--nova-border`, `--nova-border-strong`, `--nova-primary`, `--nova-primary-hover`, `--nova-on-primary`, `--nova-secondary`, `--nova-success`, `--nova-warning`, `--nova-danger`, `--nova-info`, `--nova-pending`, `--nova-focus-ring`, `--nova-overlay`, `--nova-chart-1`, `--nova-chart-2`, `--nova-chart-3`, `--nova-chart-4`.

The CSS block at spec:284-313 adds radii `--nova-radius-xs/sm/md/lg/xl/pill` and shadows `--nova-shadow-sm/md/lg`. The block omits the four chart keys. Take those from the colour table at spec:274-277. Spacing keys are `space-0` to `space-20` on a 4px base, not CSS custom properties in the block. Fonts are Inter and JetBrains Mono (spec:318).

## Agent UI states (spec:394-399)

Planning, Approval required, Executing, Verified success, Failed/uncertain, and Empty/loading/offline/permission-denied. Six states, not four.

## Build sequence

| # | Task | Artifact | Test |
|---|---|---|---|
| 1 | Copy the spec:284-313 CSS token block verbatim. Append the four chart keys from the spec:274-277 colour table, which the block omits. | `apps/web/styles/tokens.css` | The copied block matches spec:284-313 byte for byte, and the four `--nova-chart-*` keys carry both theme values |
| 2 | Build the theme switch with persistence and system preference | web app | Both themes render from the same keys |
| 3 | Implement the 25-row token table as a typed token file | `tokens.ts` | Typed file has exactly 25 color keys |
| 4 | Implement the 11 `type.*` tokens from spec:322-332, then the spec:334 rules on spacing, caps and tabular numerals | `typography.css` | All 11 tokens resolve, long-word overflow passes, and a money and a date value render with tabular numerals |
| 5 | Implement spacing on the 4px base, then copy the layout dimension table from spec:340-360 | `spacing.css` | Spacing tokens are multiples of 4, and the layout values match spec:340-360 |
| 6 | Build Button with all variants and states: default, hover, active, focus-visible, loading, disabled | `components/Button/` | Focus-visible present on every control |
| 7 | Build TextField, TextArea, Select, Combobox with invalid, read-only and no-results states | `components/` | `aria-describedby` links the error |
| 8 | Build Card, Badge, Tabs, Dialog, Drawer, DataTable, Timeline with specified states | `components/` | Dialog traps focus and closes safely |
| 9 | Build ChatMessage, ApprovalCard, FileDropzone, EmptyState, Skeleton, Toast, DatePicker | `components/` | ApprovalCard shows hash, expiry and consequence |
| 10 | Build the 10 domain card variants: email, event, task, note, transaction, trip, job, application, approval, document | `components/cards/` | Each of the 10 cards renders default, loading, empty, error and denied states |
| 11 | Implement all six agent UI states with honest copy | `components/agent-states/` | No `done` renders before verification |
| 12 | Build the action preview: target, exact fields, permissions, side effects, reversibility, expiry, policy rationale. Each domain page verifies the live match in P6 to P9 | `components/ActionPreview/` | The rendered preview matches the tool-call fixture exactly |
| 13 | Add approval, rejection, edit and expiry outcomes, keyboard reachable | ActionPreview | Full flow works without a mouse |
| 14 | Implement responsive layouts at 640, 768, 1024, 1280 and 1536, plus 320 for chat | layouts | Screenshot tests at each width |
| 15 | Build the app shell: navigation, command palette, user menu, theme, status, audit link | `apps/web/shell/` | Navigation is keyboard reachable |
| 16 | Add reduced-motion and high-contrast support | global styles | Preference changes take effect |
| 17 | Set up Playwright. Write the sign-in and approval-rejection flows that every domain page reuses. Sign-in seeds a P2 local session, so the OIDC gate cannot block it (spec:873). | `apps/web/e2e/` | Both flows run against the local stack and fail on a regression |
| 18 | Run an accessibility pass: contrast, labels, focus order, ARIA, keyboard, hit targets 40-44px | `a11y-report.json` | The report lists zero violations of severity critical, and every entry carries an element selector |
| 19 | Test with a screen reader: navigation, focus announcements and action previews | `a11y-screen-reader.md` | The record lists each flow tested and its result (spec:390, spec:873) |
| 20 | Add the empty, loading, offline and permission-denied state for every shared component | components | Each state renders, none shows fake data |

## Build order

Work these steps in order. A step names tasks from the table above.

1. Copy the CSS tokens and build the theme switch.
2. Build Button and TextField with every state, then the action preview.
3. Run the accessibility crawl before any domain page starts.

## Acceptance tests

- `test_token_diff_empty` — the block copied from spec:284-313 matches byte for byte, and the four chart keys from spec:274-277 are present.
- `test_typed_token_file_has_25_keys` — the count is 25, not 24 or 26.
- `test_spacing_base_is_4px` — every value in `spacing.css` is a multiple of 4, and the layout dimension table matches spec:340-360.
- `test_focus_visible_on_every_control` — a crawl finds no interactive element without `:focus-visible`.
- `test_status_not_color_alone` — each status carries an icon or a text label.
- `test_no_unverified_done` — the success state never renders before the verifier passes.
- `test_action_preview_equals_execution` — the rendered preview matches the tool-call fixture exactly. Each domain page repeats the check against its own live execution in P6 to P9.
- `test_approval_keyboard_reachable` — approve, reject, edit and expire all work without a mouse.
- `test_chat_usable_at_320px` — approval details stay visible at 320px.
- `test_contrast_meets_wcag_aa` — the scan reports no normal-text ratio below 4.5:1 and no large-text ratio below 3:1.

## Risks

- The spec states the tokens are recommendations, not a measured Figma export. Measure contrast in the built UI and record the result (see `claims-ledger.md` open claims).
- Page bodies belong to modules 09, 10, 11, 12, 13 and 20. Do not absorb them here or this module will blow past 200 lines.
- Accessibility is cheapest when built in. Run the crawl after every component batch, not once at the end.
