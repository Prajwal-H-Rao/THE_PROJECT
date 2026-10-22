# The api-gateway service

The `api-gateway-bff` of the NOVA catalogue. It holds the user session, the request validation,
the rate limit, the CSRF and origin checks and the trace ids. The service runs on Next.js 16.

## What it holds

- `src/proxy.ts` — the proxy. It runs before the route handlers. It holds the request chain.
- `src/instrumentation.ts` — the startup check. The server answers every request with 500 when the
  session secret is missing.
- `src/app/health/live/route.ts` — the live health route. It is public.
- `src/app/health/ready/route.ts` — the ready health route. It is public.
- `src/app/api/v1/[...slug]/route.ts` — the API route. It holds no domain path yet.
- `src/lib/settings.ts` — the settings. The environment supplies the values with the `NOVA_` prefix.
- `src/lib/session-token.ts` — the session token format and its verifier. The gateway holds no signer.
- `src/lib/session.ts` — the session check and the request context.
- `src/lib/csrf.ts` — the origin allow-list and the csrf check.
- `src/lib/rate-limit.ts` — the fixed window limiter. It bounds the tracked keys.
- `src/lib/trace.ts` — the trace context of a request.
- `src/lib/client-address.ts` — the client address of a request.
- `src/lib/body.ts` — the capped body reader.
- `src/lib/responses.ts` — the JSON answers.
- `src/lib/logging.ts` — the request log. It holds no secret.
- `src/lib/health.ts` — the health bodies.
- `src/test/session-fixture.ts` — the test client. It signs the tokens and it calls the server.
- `src/test/server-fixture.ts` — the test server. It runs the built gateway on a free port.
- `src/test/session.test.ts` — the session tests.
- `src/test/middleware.test.ts` — the trace, the rate limit and the csrf tests.
- `src/test/body.test.ts` — the body limit tests.

## The request chain

1. The proxy resolves the trace id.
2. The address rate limit. The key is the client address.
3. The session. A request without a valid session gets 401.
4. The user rate limit. The key is the user id of the session.
5. The origin and the csrf check. They apply to a cookie write.
6. The route handler. It holds no domain path yet. An unknown path gives 404.

The proxy matcher covers `/api/:path*`. The health routes stay public.

## The environment

- `NOVA_SESSION_SECRET` — the session secret. It must hold at least 32 bytes. The server answers every request with 500 when it is missing.
- `NOVA_ALLOWED_ORIGINS` — the comma-separated list of the origins that may send a cookie write. An empty list allows none.
- `NOVA_RATE_LIMIT_MAX` — the requests per key and window. It holds 60.
- `NOVA_RATE_LIMIT_WINDOW_MS` — the window length in milliseconds. It holds 60000.
- `NOVA_MAX_BODY_BYTES` — the body limit in bytes. It holds 1048576.
- `NOVA_TRUST_PROXY` — the number of proxy hops that append to `x-forwarded-for`. It holds 0. The gateway then trusts no client address and the address window stays off. A deployment behind the edge of module 01 task 17 sets it to the number of hops, and the edge must append the address it saw.
- `NOVA_HOST` — the address that the server binds. It holds 127.0.0.1.
- `NOVA_PORT` — the port that the server binds. It holds 8000. The start script reads both.

## The session token

The token is `v1.<base64url payload>.<base64url signature>`. The signature is HMAC-SHA256 over
`v1.<payload>`. The payload holds `sub`, `sid`, `tenant`, `channel`, `csrf`, `iat` and `exp`.

The gateway verifies a token. It never signs one. The identity service of module 07 issues the
token and sets the cookies. The gateway reads the user id, the tenant scope and the channel
identity from the verified claims. It never trusts a user id from a header or a body.

The token carries no issuer, no audience and no key id. One secret per environment keeps the
tokens apart. Rotating `NOVA_SESSION_SECRET` ends every session.

## The cookies

- `nova_session` holds the session token. It is `HttpOnly`, `Secure` and `SameSite`.
- `nova_csrf` holds the CSRF token. It is readable, so the browser can copy it into the `x-csrf-token` header.

A cookie write needs an allowed `origin` header, the `x-csrf-token` header and the `nova_csrf`
cookie. The `Session` scheme of the `Authorization` header carries the user token. The `Bearer`
scheme stays free for the service token of module 01 task 8.

## How to run it

```bash
npm ci
npm run build
npm run build:test
npm test
NOVA_SESSION_SECRET=... npm start
```

The test starts the built server on a free port. Run `npm run build` before `npm test`. The
pretest script fails when the test build is missing.

## What arrives later

- The workload identity of module 01 task 8 adds the service token.
- The domain routes arrive with the domain services.
- The CORS allow-list, the content security policy, the SSRF guard, the file limits, the account
  lockout and the step-up authentication stay with module 07 tasks 13, 14, 18 and 10.
- The rate limiter moves to Redis with module 01 task 6. It stays per process until then.
- The image build stays with module 01 task 14. The image must hold the app output and not the test output.
