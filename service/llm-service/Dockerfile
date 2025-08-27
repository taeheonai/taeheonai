FROM nvcr.io/nvidia/cuda:11.8.0-devel-ubuntu20.04

# 환경 변수 설정
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV CUDA_HOME=/usr/local/cuda
ENV PATH=${CUDA_HOME}/bin:${PATH}
ENV LD_LIBRARY_PATH=${CUDA_HOME}/lib64:${LD_LIBRARY_PATH}

# 시스템 패키지 업데이트 및 설치
RUN apt-get update && apt-get install -y \
    python3.9 \
    python3.9-dev \
    python3-pip \
    git \
    wget \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Python 3.9을 기본 Python으로 설정
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.9 1
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 1

# pip 업그레이드
RUN python -m pip install --upgrade pip

WORKDIR /app

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# PyTorch CUDA 버전 설치 (CUDA 11.8 호환)
RUN pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

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
