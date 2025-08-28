FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 서비스 설정
ENV SERVICE_NAME=gri-service \
    VERSION=1.0.0 \
    PORT=8003

# LLM 서비스 설정 (기본값, 실행 시 오버라이드 가능)
ENV LLM_SERVICE_URL=http://llm-service:8002 \
    LLM_SERVICE_TIMEOUT=30.0

# 데이터베이스 설정 (기본값, 실행 시 오버라이드 필수)
ENV DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/gri_db

EXPOSE 8003

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8003/health || exit 1

CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT