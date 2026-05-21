# ── Build stage ───────────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM python:3.11-slim

# System libraries required at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
        # OpenCV runtime deps
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
        libgl1 \
        # poppler-utils: pdfinfo, pdftoppm – used by pdf2image
        poppler-utils \
        # Note: libmagic1 NOT needed – we use pure-Python 'filetype' package
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

WORKDIR /app

# Copy application source
COPY main.py        ./main.py
COPY services/      ./services/
COPY routers/       ./routers/

# Non-root user for security
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000

# Health-check so container orchestrators can probe readiness
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/health')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
