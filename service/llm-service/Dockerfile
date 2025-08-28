FROM python:3.11-slim

# 런타임 품질/속도용 기본 ENV
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# 1) 의존성 레이어 고정(캐시 효율 ↑)
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# CPU 전용 PyTorch 설치 (필요한 경우에만 주석 해제)
# RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# 2) 앱만 복사(전체 COPY 금지)
COPY app ./app

# 3) 포트/시작 커맨드
ENV PORT=8005
EXPOSE 8005

# exec-form로 신호/종료 처리 정확하게, ENV 확장은 sh -c로
CMD ["sh","-c","uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]