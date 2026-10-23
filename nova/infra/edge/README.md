# NOVA HTTPS Edge

This directory holds the public edge configuration for the local Compose stack.

## Components

- **Caddyfile** — Caddy 2 configuration. It terminates TLS on port 443 and proxies to the api-gateway on port 8000. `auto_https off` disables the HTTP-to-HTTPS redirect and the ACME listener on port 80, so plain HTTP is refused. `tls internal` makes Caddy issue its own local CA and a certificate for `nova-gateway.test`. The CA certificate is written to the Caddy data volume at `/data/caddy/pki/authorities/local/root.crt`.

## Networks

- `nova-edge` — the public edge network. Only the Caddy service joins it.
- `nova-app` — the private application network. Both Caddy and the api-gateway join it. Caddy reaches the gateway via the `api-gateway` service name on port 8000.

## Ports

- Port 443 is published on the host. No port 80 is published.

## Verification

The CI step `Test the HTTPS edge`:
1. Starts the stack with the `edge` profile.
2. Waits for the gateway `/health/live` endpoint.
3. Extracts the Caddy root CA from the `caddy-data` volume.
4. Curls `https://nova-gateway.test/health/live` with `--cacert` and `--resolve`, expecting `{"status":"live"}`.
5. Curls plain `http://nova-gateway.test/health/live` (port 80, unpublished) and expects connection refused.
6. Tears the stack down.

## Image

Caddy image pinned by digest in `compose.platform.yaml`. The image runs non-root (Caddy default UID 1000).