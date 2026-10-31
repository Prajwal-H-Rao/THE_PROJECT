# Multi-stage Dockerfile for Model Gateway (Module 05: Local Model Runtime)
# Runs the Flask service that proxies to Ollama for local model inference

# Stage 1: Build
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim AS runner

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY model_gateway.py .

# Copy model registry
COPY models/model-registry.yaml /app/models/model-registry.yaml

# Create non-root user
RUN addgroup -g 1001 -S nova && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G nova nova && \
    chown -R nova:nova /app

USER nova

# Make sure user packages are in PATH
ENV PATH=/root/.local/bin:$PATH

EXPOSE 8002

CMD ["python", "model_gateway.py"]