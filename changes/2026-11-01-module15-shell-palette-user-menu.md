# 2026-11-01 module15-shell-palette-user-menu

## Summary
Plan task 15 remainder landed. The app shell already had navigation, theme, status and audit link. Two files complete the task 15 list:

- `nova/apps/web/shell/command-palette.tsx` — command palette on the existing Dialog primitive. Mod+K toggles it. Arrow keys move the active row, Enter runs it, Escape closes. Filter with a no-results row. All labels come from props.
- `nova/apps/web/shell/user-menu.tsx` — user menu on the declared unified `radix-ui` package (DropdownMenu namespace, no new dependency). Avatar trigger from initials prop. Escape closes and focus returns to the trigger. `danger` items use the destructive token. No new dependency.

Wiring: `Shell` takes optional `palette` and `userMenu` slots and forwards them to `ShellHeader`, which renders them in the right cluster. The three existing shell files keep their shape; only optional props were added.

## Checks
- `tsc --noEmit` passes in `nova/apps/web`.
- New files: command-palette 156 lines, user-menu 78 lines. Header comments present. ASD-STE100 comments.
- Negation: two subagents signed the approach with two conditions, both met — user menu keyboard contract stated in the header comment; base is the declared `radix-ui` package, not an undeclared `@radix-ui/react-dropdown-menu`.

## Notes
- Pre-existing hardcoded aria-labels in `shell-header.tsx` and `shell-nav.tsx` stay for plan task 21, per negator review.
- Plan task 20 was blocked by both negators. Revised scope surfaced to the user: reuse `EmptyLoadingOfflineDeniedState`/`CardState` patterns, per-component applicable states, applicability map, aria roles carried, one spelling for permission-denied, and a named offline driver (`useOnlineStatus` hook).
