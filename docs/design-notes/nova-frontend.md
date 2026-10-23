# Frontend

## Chosen (spec:429)

**Next.js + React + Tailwind**

## Rationale

- SSR/SSG with Next.js for performance and SEO.
- React/Tailwind for component design system (shadcn/ui).
- Unified stack for gateway (Next.js) and web app reduces context switching.

## Rejected

| Option | Reason |
|--------|--------|
| Plain React Create-React-App | No SSR/SSG, no file-based routing, no built-in image optimization, no API routes. |
| Svelte | Different ecosystem; team expertise and shadcn/ui components are React-based. |
| Vue | Different ecosystem; same reasoning as Svelte. |

## Re-check

Record re-check date in `claims-ledger.md` before relying on this row.