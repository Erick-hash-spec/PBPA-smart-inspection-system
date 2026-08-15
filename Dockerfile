# ── Backend Stage ──────────────────────────────────────────────────────────
FROM python:3.11-slim as backend

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd -m -u 1000 appuser

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Django project
COPY --chown=appuser:appuser backend/ .

# Collect static files
RUN mkdir -p /app/staticfiles /app/media /app/logs && \
    chown -R appuser:appuser /app && \
    python manage.py collectstatic --noinput --clear || true

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Run gunicorn with security settings
CMD ["gunicorn", \
     "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--worker-class", "sync", \
     "--worker-tmp-dir", "/dev/shm", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "50", \
     "--timeout", "60", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]

# ── Frontend Build Stage ────────────────────────────────────────────────────
FROM node:18-alpine as frontend-build

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY frontend/ .

# Build with security considerations
ENV CI=true
RUN npm run build

# ── Frontend Production Stage ────────────────────────────────────────────────
FROM node:18-alpine as frontend

WORKDIR /app

# Install serve utility
RUN npm install -g serve

# Create non-root user
RUN addgroup -g 1000 appuser && adduser -D -u 1000 -G appuser appuser

# Copy built app from build stage
COPY --from=frontend-build --chown=appuser:appuser /app/build ./build

# Switch to non-root user
USER appuser

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["serve", "-s", "build", "-l", "3000"]

