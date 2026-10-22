# Design note: the object store of the local stack

Date: 2026-10-22. Status: adopted for P1 module 01 task 7.

## The switch

The build plan named MinIO. MinIO deleted its public Docker Hub images in September 2026.
The anonymous pulls from Quay answered 401 in October 2026. No trusted image binary of
MinIO reached the build anymore, so the stack needed another S3 store.

RustFS 1.0.3 is Apache-2.0, and it serves the S3 API. The words of the build row stay
true: the spec asks for MinIO/S3-style stores and the store now answers as S3. The
compose file names the switch in a comment above the service.

## What RustFS 1.0.3 gives the stack

- One port, 9000, carries the S3 data plane and the admin API. The console is off by
  configuration in the stack (`RUSTFS_CONSOLE_ENABLE=false`).
- The health route answers unsigned at `/health/ready`, so the container healthcheck
  needs no credential.
- The admin API answers on `/minio/admin/v3` and falls back to `/rustfs/admin/v3`. The
  init sidecar tries both path forms.
- The admin API supports users, policies and policy bindings. It does not support
  per-request conditions in its policies. The prefix scope must therefore be total:
  one store name per identity, and every policy names only its own store.

## The identity model

Each service prefix becomes one store whose name equals its IAM user name. The policy
of an identity lists only `arn:aws:s3:::<name>` and the child resource of that store.
The isolation test proves the rule from both sides: a cross-store list and a cross-store
put answer 403, an own-store list and put answer 200. The positive control keeps the
deny honest, because a wrongly configured policy that grants nothing would deny both.

## What waits

- The least-privilege object matrix of spec:786 waits for P3, where the document
  service fixes the real read/write split. Order rule 3 keeps row 7 on the local
  runtime proof.
- The image hardening pass of task 14 covers this image in P1 and `17-deployment-hardening`
  adds the scan in P10.
- Key rotation stays manual: the identities live in the local secret file. Rotation
  lands with the secret tooling of `07-identity-authz`.

## External facts

Ledger row C18 pins the RustFS facts and their re-check date. The compose digest pins
the image bytes.
