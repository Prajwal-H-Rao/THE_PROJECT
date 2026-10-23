# The api-gateway-bff runs on Next.js

## The choice

The `api-gateway-bff` runs on Next.js 16. It uses the App Router with route handlers and the
`proxy.ts` file convention. The developer chose it.

## The deviation

The spec chose NestJS on Fastify for the backend TypeScript (spec:426). It chose Next.js + React
+ Tailwind for the frontend (spec:429). The gateway is a backend service, so it leaves the backend
row. The other TypeScript services keep NestJS on Fastify.

## The reason

- The gateway is a backend for frontend. The route handlers map to the `/api/v1/*` paths that the
  web app calls, and the proxy holds the session, the rate limit, the CSRF check and the trace ids
  in one place.
- One stack serves the gateway and the web app. The token format, the cookie names and the trace
  headers stay the same in both.
- The proxy defaults to the Node.js runtime in Next.js 16, so the HMAC verification uses
  `node:crypto` and needs no polyfill.

## The cost

- The gateway image carries Next.js and React. Module 01 task 14 builds it.
- The repo holds two backend stacks. The NestJS services start in P2.
- The `middleware.ts` convention is deprecated in Next.js 16. The gateway uses `proxy.ts`.

## The image (module 01 task 14)

The image build sets `output: "standalone"`. The standalone server reads the
standard `PORT` env, not the `NOVA_PORT` the package wires for `next start`,
so a compose service for this image maps `PORT`. With the standalone output,
`next start` still serves locally but prints a warning. A future Next.js bump
that hardens that warning into an error would break the CI gateway test step;
that bump then revisits the local run script. The build stays clean. The CI
image step pins the non-root user and greps the image files for the local
secret value prefixes `nova-local-` and `nova-store-`.

## The boundary

The gateway holds the session, the rate limit, the CSRF and origin checks, the trace ids and the
body limit. It routes no domain path yet. The CORS allow-list, the content security policy, the
SSRF guard, the file limits, the account lockout and the step-up authentication stay with module
07 tasks 13, 14, 18 and 10.
