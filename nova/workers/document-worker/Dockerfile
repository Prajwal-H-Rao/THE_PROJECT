# Document worker image. Task 06.12 (module 06).
# Purpose: the sandboxed parser-worker container the Compose sandbox wraps.
# The Compose sandbox file adds the runtime guards: read-only root, tmpfs,
# dropped capabilities, seccomp and resource limits (specs 673 and 692).
# The image itself carries the non-root rule.

# Pinned minimal base. Digest pinning is asserted by the packaging checks.
FROM python:3.12-slim

# Task 06.10 provisions the RQ worker runtime. This image carries only the
# queue runtime; parser libraries join in task 06.10 and never in the request
# worker (task 06.11).
RUN pip install --no-cache-dir rq==1.19.2 redis==5.2.1

# The worker never needs root at runtime, so it never runs as root.
RUN useradd --system --home-dir /home/docworker --create-home --uid 10001 docworker
USER docworker
WORKDIR /home/docworker

# The entrypoint is the queue worker command. Task 06.10 may refine the queue
# name; the process model stays the same.
CMD ["python", "-m", "rq", "worker", "document"]
