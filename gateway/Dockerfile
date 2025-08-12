FROM python:3.11-slim

# 시스템 패키지 업데이트 및 curl 설치 (헬스체크용)
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Docker 환경에서 PORT 환경변수 사용
ENV PORT=8080
EXPOSE 8080

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/v1/health || exit 1

# 다른 서비스들과 일관성 있는 CMD 형식
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT