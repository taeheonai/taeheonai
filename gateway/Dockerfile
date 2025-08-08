FROM python:3.11-slim

# 시스템 패키지 업데이트 및 curl 설치 (헬스체크용)
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway에서는 PORT 환경변수를 사용
ENV PORT=8080
EXPOSE 8080

# Railway 환경에 맞는 시작 명령어 (모듈 경로 수정)
CMD python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT