# ── Stage 1: base ─────────────────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (layer cache friendly)
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy frontend (served statically by Flask)
COPY frontend/ ./frontend/

# Set working directory to where app.py lives so relative paths work
WORKDIR /app/backend

# Expose the port the app runs on
EXPOSE 8080

# Seed DB on first run, then start Flask
CMD ["sh", "-c", "python seed.py && python app.py"]
