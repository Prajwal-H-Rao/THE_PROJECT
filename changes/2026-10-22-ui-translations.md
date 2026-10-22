# 2026-10-22 — Name the translation setup for the UI

## Goal

The developer asked that no UI text is hardcoded. Every string comes from a translation file. The
file holds key-value pairs by page, and the components read them with a translation hook. The
work belongs in the plan, not in a side task.

## What changed

- `docs/plan/README.md`: a new rule. No user-facing string is hardcoded in the UI. Every string
  comes from the message file at `apps/web/messages/en.json`. The keys sit under the page that
  uses them. The hook is `useTranslations` from next-intl.
- `docs/plan/01-architecture.md` task 15: the web app scaffold names the translation setup. It
  holds the provider, the locale routing and the message file.
- `docs/plan/15-design-system.md`: the goal states that no component holds hardcoded text. The
  message file sits at `apps/web/messages/en.json`, the keys sit under the page that uses them,
  and the hook is `useTranslations` from next-intl.
- `docs/plan/15-design-system.md`: a new task 21. It moves every shared string into the message
  file. A scan finds no hardcoded string in a component, and every key resolves.
- `docs/plan/15-design-system.md`: the build order runs task 21 with task 1, before the theme
  switch.
- `docs/plan/README.md`: the P4 task count moves from 20 to 21 and the plan total moves from 388
  to 389.
- `repo.md`: the plan task count moves from 388 to 389.

## Design decisions

- The message file is one `en.json`. Its top-level keys are the pages. Each page holds the
  key-value pairs of that page.
- The library is next-intl. It fits the App Router of the spec stack. It reads the message file
  on the server, and its hook works in a client component. The hook of next-intl is
  `useTranslations`. The developer wrote `useTranslation`. The name belongs to the library.
- The setup lands with the web app scaffold, because the provider and the locale routing belong to
  the app itself. The shared components follow at P4 with task 21.
- The gateway holds no user-facing text. It answers with error codes, so the message file does
  not reach it.

## Verification

- `python3 nova/tests/layout/check_layout.py` passes all 28 checks.
- `python3 nova/tests/layout/test_layout_checks.py` rejects all 68 mutations.
- `ruff check .` passes over the whole repository.
- `mypy nova` passes on the 28 Python modules.

## Open items

- The locale routing and the second locale land with the web app scaffold of module 01 task 15.
- The page keys land with the page modules of P6 to P9 and with module 20.
