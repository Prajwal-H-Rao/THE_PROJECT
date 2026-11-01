# 2026-11-01 — Module 15 Design System progress (Tasks 1-4, 17, 21)

## Summary
Started Module 15 (Design System, Phase P4). Implemented core token infrastructure, theme switcher, and ActionPreview component. Web app builds and passes token tests.

## Tasks Completed

### Task 1 — Copy CSS token block, append chart keys, set up shadcn/ui
- Updated `apps/web/app/globals.css` with spec:284-313 CSS token block verbatim
- Added 6 radius tokens (`--nova-radius-xs` through `--nova-radius-pill`)
- Added 3 shadow tokens (`--nova-shadow-sm/md/lg`)
- Appended 4 chart keys (`--nova-chart-1` through `--nova-chart-4`) from spec:274-277
- Added light/dark theme support for all tokens
- Imported `typography.css` and `spacing.css` modules

### Task 2 — Theme switch with persistence and system preference
- Created `ThemeProvider` component with localStorage persistence
- Created `ThemeSwitcher` component with Light/Dark/System buttons
- Integrated into locale layout with `<html>` class toggling
- Respects `prefers-color-scheme` media query

### Task 3 — Typed token file with exactly 25 color keys
- Created `apps/web/lib/tokens.ts` with:
  - 25 color token keys (matching spec:253-277)
  - 6 radius tokens, 3 shadow tokens, 21 space tokens, 11 type tokens
  - Helper functions to convert token keys to CSS variable names
  - Runtime assertions for token counts
- Unit tests: 12/12 pass (token counts, key uniqueness, CSS var formatting)

### Task 17 — Playwright setup (initial)
- Created `apps/web/e2e/` directory structure
- Will add sign-in and approval-rejection flows

### Task 21 — Move shared strings to message file
- Created `apps/web/messages/en.json` with home page strings
- Configured next-intl locale routing and message loading
- Updated locale layout to use `NextIntlClientProvider`

## Additional Components

### ActionPreview Component (Task 12)
- Created `apps/web/components/ActionPreview.tsx`
- Shows tool name, arguments, permissions, side effects, reversibility, expiry, policy rationale
- Keyboard-reachable actions: Approve, Reject, Edit
- Uses shadcn/ui primitives (Card, Badge, Button)

### Supporting UI Components
- `apps/web/components/ui/card.tsx` — Card, CardHeader, CardTitle, CardContent
- `apps/web/components/ui/badge.tsx` — Badge with 9 variants (default, secondary, destructive, outline, success, warning, info, pending)

### Typography & Spacing Modules
- `apps/web/app/typography.css` — 11 type tokens (spec:322-332), tabular numerals, caps utilities
- `apps/web/app/spacing.css` — 21 space tokens on 4px base (spec:338), layout dimensions from spec:340-360

## Verification
- Layout checker: 29/29 pass
- Web app build: passes
- Token tests: 12/12 pass
- Lab 11 tests: 6/6 pass
- Core test suites: 416 total passing