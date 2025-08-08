FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway에서 제공하는 PORT 환경변수 사용
ENV PORT=8006
EXPOSE 8006

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8006/health || exit 1

CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT