# 2026-10-22 — Name the UI component base and the colour rule

## Goal

Name the base of the UI components and the colour rule for the design process. The developer
asked for shadcn/ui on Tailwind, and for a rule that holds no purple, no shade of purple and no
blue unless the work asks for it.

## What changed

- `docs/plan/README.md`: a new rule. The UI components come from the shadcn/ui CLI. The CLI
  copies the component source into `apps/web/components/ui/`. The repo holds no shadcn runtime
  dependency. The `--nova-*` tokens replace the shadcn colour variables. The variants come from
  `class-variance-authority`.
- `docs/plan/01-architecture.md` task 15: the web app scaffold names shadcn/ui.
- `docs/plan/15-design-system.md`: the goal names shadcn/ui as the base of the components. Task 1
  sets up shadcn/ui on the token theme. Tasks 6 to 9 name the shadcn primitive behind each
  component.
- `docs/plan/15-design-system.md`: a new constraint. No component uses purple, a shade of purple
  or blue, unless a spec token demands it. The palette follows the colour combinations of the
  Figma resource library.
- `docs/plan/15-design-system.md` task 1: the accents outside the token table come from the Figma
  colour combinations library, without purple or blue.
- `docs/plan/15-design-system.md`: a new risk. The colour rule and the spec token table disagree.

## Design decisions

- shadcn/ui fits the spec stack. The spec chose Next.js + React + Tailwind, and shadcn/ui copies
  Tailwind components into the repo. It adds no runtime dependency and every variant stays
  editable.
- The colour rule and the spec conflict. The token values of spec:253-277 are blue and violet,
  and task 1 copies that block byte for byte. The token layer keeps the spec values, because the
  spec wins on every conflict. The rule holds for every colour outside the token table. A change
  to the spec values needs a spec change first.
- The rule reached the design process. It sits in the constraints of module 15, in the task that
  picks the accents, and in the risk that names the conflict.

## Verification

- `python3 nova/tests/layout/check_layout.py` passes all 28 checks.
- `python3 nova/tests/layout/test_layout_checks.py` rejects all 67 mutations.
- `ruff check .` passes over the whole repository.
- `mypy nova` passes on the 27 Python modules.

## Open items

- The spec token table needs a change before the rule can reach the token layer. The task records
  the conflict. It does not resolve it.
- Module 15 runs at P4. The shadcn setup and the component work land with it.
