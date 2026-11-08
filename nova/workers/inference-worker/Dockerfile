# Inference worker image. Task 06.16 (module 06, P3).
# Purpose: the sandboxed inference worker container the Compose sandbox wraps.
# The Compose sandbox file adds the runtime guards: read-only root, tmpfs,
# dropped capabilities, seccomp and resource limits (specs 673 and 692).
# The image itself carries the non-root rule.

# Pinned minimal base.
FROM python:3.12-slim

# RQ worker runtime plus HTTP client to call the ML service. ML model weights
# (sentence-transformers, transformers) load inside the ML service image, not
# here — this worker only queues and runs inference tasks.
RUN pip install --no-cache-dir rq==1.19.2 redis==5.2.1 httpx==0.27.2

# The worker never needs root at runtime.
RUN useradd --system --home-dir /home/inferenceworker --create-home --uid 10002 inferenceworker
USER inferenceworker
WORKDIR /home/inferenceworker

CMD ["python", "-m", "rq", "worker", "ml_inference"]
