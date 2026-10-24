# Dual-model (SVR + LightGBM) sales forecasting API.
# Python pinned to match the interpreter that produced the joblib artifacts,
# which avoids cross-version unpickling surprises.
FROM python:3.14-slim

# System deps: libgomp1 is required by LightGBM at runtime; curl powers the healthcheck.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgomp1 curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /api

# Install Python deps first so the layer caches across code changes.
COPY requirements-dual.txt ./
RUN pip install --no-cache-dir -r requirements-dual.txt

# App code + trained artifacts.
COPY . /api

# Drop root.
RUN useradd --create-home --uid 1000 appuser && chown -R appuser:appuser /api
USER appuser

ENV API_HOST=0.0.0.0 \
    API_PORT=8000 \
    LOG_LEVEL=INFO

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

# Serve the dual-model app (NOT the legacy darts/Mongo app.py).
CMD ["uvicorn", "dual_app:app", "--host", "0.0.0.0", "--port", "8000"]
