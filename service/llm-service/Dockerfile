FROM python:3.11-slim

# 환경 변수 설정
ENV PYTHONUNBUFFERED=1

# 시스템 패키지 업데이트 및 설치 (최소한으로 유지)
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# pip 업그레이드
RUN python -m pip install --upgrade pip

WORKDIR /app

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# PyTorch CPU 버전 설치
RUN pip install --no-cache-dir torch torchvision torchaudio \
    --index-url https://download.pytorch.org/whl/cpu

# 애플리케이션 코드 복사
COPY . .

# 출력 디렉토리 생성
RUN mkdir -p outputs data

# Railway에서 제공하는 PORT 환경변수 사용
ENV PORT=8005
EXPOSE 8005

# 헬스체크
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8005/health || exit 1

# 기본 명령어 (FastAPI 서버)
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
