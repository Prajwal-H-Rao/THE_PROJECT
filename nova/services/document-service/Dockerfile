# Document Service Worker - Sandboxed Parser
# Runs as non-root with read-only root filesystem, dropped capabilities, and resource limits

FROM python:3.12-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final stage
FROM python:3.12-slim

# Install runtime dependencies for parsers
RUN apt-get update && apt-get install -y --no-install-recommends \
    # For PyMuPDF (fitz)
    libmupdf-dev \
    mupdf-tools \
    # For python-docx
    libxml2-dev \
    libxslt-dev \
    # For pandas
    libopenblas-dev \
    # For OCR (tesseract)
    tesseract-ocr \
    tesseract-ocr-eng \
    # For PDF tools
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /bin/bash appuser

# Set up app directory
WORKDIR /app

# Copy Python packages from builder
COPY --from=builder /root/.local /home/appuser/.local
ENV PATH=/home/appuser/.local/bin:$PATH

# Copy application code
COPY --chown=appuser:appuser . .

# Create quarantine and temp directories with correct ownership
RUN mkdir -p /app/quarantine /app/tmp && chown -R appuser:appuser /app/quarantine /app/tmp

# Switch to non-root user
USER appuser

# Set environment
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV HOME=/app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import redis; r=redis.from_url('redis://redis:6379/0'); r.ping()" || exit 1

# Run worker
CMD ["python", "-m", "nova.services.document_service.worker.cli", "worker"]