# The observability contract of this phase

## Purpose

This directory holds the observability rules of module 01 task 11. The phase
propagates the trace context only. No collector and no trace backend run in
this phase. Module 16 task 8 finishes the OpenTelemetry trace and spans the
gateway, the database, the queue workers and the providers (P10).

## The one trace context

The NOVA trace context is one W3C traceparent value. Its format is
`00-<32 hex>-<16 hex>-01`. Every hop of the system either validates the trace
id it receives or generates a fresh context. No hop echoes an untrusted value.

- The gateway edge: `services/api-gateway/src/lib/trace.ts` reads the
  `traceparent` header, accepts a second field of 32 hex, and generates a fresh
  context otherwise. It also derives the correlation id from
  `x-correlation-id` when the value fits the correlation pattern.
- The queue envelope: spec:755 carries the trace through the `correlation_id`
  field. A producer that holds a trace id writes it there, so the envelope is
  the single record a consumer needs.
- The queue runner: `services/api-gateway/queues/traceparent.mjs` plays the
  same rules locally, because the runner image copies only `queues/`.

## Redaction

Spec:911 governs labels. No trace label holds a payload, a secret, an email
body, a resume or a high-cardinality personal value. The trace id, the span id
and the correlation id are the only per-request labels of this phase. Error
traces hold the same rule at spec:787: no secret reaches a log line.

## The proof of this phase

The CI queue-restart step asserts the equality of the `trace=` field across the
ENQUEUE and VERIFY record lines. It proves that one id survives the broker
restart inside the envelope token. The CI run synthesizes its own context; the
injected-header path is exercised by the gateway trace test family at
`src/test/trace.test.ts`. The database span waits for the first worker that
writes rows (module 06 and later).

## What lands later

Module 16 task 8 lands the collector, the exporter and the full span. The
plan rule holds: a later module extends the shared artifact. It does not
rebuild it.
