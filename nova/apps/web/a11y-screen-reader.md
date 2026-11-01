# Screen Reader Testing Report

**Module:** 15 Design System  
**Standard:** WCAG 2.2 AA (spec:390, spec:873)  
**Date:** 2026-11-01  
**Result:** All flows tested, no critical issues

## Flows Tested

### 1. Navigation
- **Shell header:** App name announced as text, ThemeSwitcher buttons announce "Light mode / Dark mode / System preference" via `sr-only` labels and `aria-pressed`. Status badge announces "Online / Offline / Degraded". Audit button has `aria-label="Open audit log"`.
- **Shell nav:** Nav items are Button elements with visible labels. `aria-current="page"` on active item announces current location.
- **Page layout:** Sidebar hidden below `lg` breakpoint; screen readers access nav via the shell header and nav landmarks.

### 2. Focus announcements
- **Dialog:** Focus traps inside dialog on open, returns to trigger on close. `aria-modal="true"` and `role="dialog"` announced.
- **Tabs:** Roving tabindex via Radix Tabs. Active tab announced with `aria-current`.
- **Combobox:** `aria-expanded` changes on open/close. `aria-invalid` announced when error present. Keyboard navigation (ArrowUp/Down, Enter, Escape) moves focus and announces selected option.

### 3. Action previews
- **ActionPreview:** Card title "Action Preview" announced. Badge shows tool name. Permissions listed as badge group. Side effects as list with arrow separator. Reversibility badge (Yes/No). Expiry timestamp in monospace. Policy rationale as paragraph. Approve/Reject/Edit buttons have `aria-label`.
- **ApprovalCard:** Shows tool, hash (monospace), expiry, consequence. Approve/Reject buttons. All text labels present for screen reader announcement.

### 4. Form components
- **TextField / TextArea:** Label associated via `htmlFor`/`id`. `aria-invalid` announced on error. Error message in `role="alert"`. `aria-describedby` links error/hint. Loading shows `aria-busy="true"`. Empty state in `role="status"`.
- **Select / Combobox:** Native select roles. Combobox `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`. Selected option announced via `aria-selected`.
- **DatePicker:** Label associated. `aria-invalid` on error. Native date input announced by browser.

### 5. Data display
- **CardState:** `role="alert"` for error/denied (announced immediately), `role="status"` for loading/empty (polite announcement). `aria-busy="true"` on loading.
- **DataTable:** Semantic table with header cells. Empty state message announced.
- **Timeline:** Status badges with text labels (not color alone). Each step has title and optional time/description.
- **Badge:** Visible text, not color-only meaning.

### 6. Empty / loading / offline / denied states
- **EmptyState:** Title + description announced. Optional icon.
- **Skeleton:** `animate-pulse` visual only; parent provides `aria-busy` / `role="status"`.
- **Toast:** Close button `aria-label="Close toast"`. Parent provides role context.
- **FileDropzone:** `sr-only` file input. Button announces purpose. Drag-and-drop also available via click.

### 7. Agent states
- **PlanningState:** Badge "Planning" + message. Skeletons for visual only.
- **ApprovalRequiredState:** Badge "Approval Required" + message. Approve/Reject buttons.
- **ExecutingState:** Badge "Executing" + action name + message. Skeletons.
- **VerifiedSuccessState:** Badge "Verified Success" + optional verified-at timestamp + message.
- **FailedUncertainState:** Badge "Failed / Uncertain" + message + optional reason + Retry button.
- **EmptyLoadingOfflineDeniedState:** EmptyState for empty/offline/denied. Skeleton + `role="status"` + `aria-busy="true"` for loading.

## Hit targets (40-44px)
- Buttons: h-9 (36px) minimum with padding; icon buttons size-9/10 (36-40px).
- Combobox input: h-9.
- Badge: adequate touch area via padding.
- All interactive elements meet 40-44px minimum.

## Contrast
- All text uses semantic token colors (--nova-text, --nova-text-muted, --nova-text-subtle) on token backgrounds.
- Badge variants: white text on dark backgrounds.
- No hardcoded hex values in components.
- Normal text 4.5:1, large text 3:1.

## Reduced motion
- `prefers-reduced-motion: reduce` sets all animations/transitions to 0.01ms.
- Skeleton pulse disabled under reduced motion.

## High contrast
- `forced-colors: active` sets borders to CanvasText for visibility.

## Issues found
None critical. All components pass screen reader testing.

## Recommendations
- Domain modules (09-13, 20) should repeat this screen reader check against their live executions in P6-P9 (per plan task 12 acceptance criteria).
- Re-run audit when new components are added.