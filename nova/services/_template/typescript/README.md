# The TypeScript service template

Copy this directory to `services/<service-name>/` and rename the package.

## What it holds

- `src/settings.ts` — the settings. The environment supplies the values with the `NOVA_` prefix.
- `src/health.ts` — the health endpoints. They leak no secret.
- `src/app.ts` — the service. It serves the health endpoints and answers 404 for anything else.
- `src/main.ts` — the process entry point.
- `src/test/health.test.ts` — the test that proves the service serves `/health/live`.
- `Dockerfile` — the image. The build is multi-stage and the runtime user is not root.

## How to run it

```bash
npm ci
npm run build
npm test
npm start
```

## How to check it

```bash
npm run build
```

The build is the typecheck. The compiler runs with `strict` and the build fails on a type error.
The CI workflow runs the build and the test. The test starts the real server on an ephemeral
port and calls the health endpoint over HTTP.
