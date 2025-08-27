"""
빠른 학습을 위한 SLLM 훈련 설정 파일
학습 시간을 단축하기 위해 최적화된 설정
"""

import os
from typing import List

# ---------- 모델 설정 ----------
MODEL_NAME = os.getenv("MODEL_NAME", "beomi/KoAlpaca-Polyglot-5.8B")

# ---------- 데이터 설정 ----------
DATA_PATH = os.getenv("DATA_PATH", "./data/gri_all.jsonl")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./outputs/srlm-koalpaca-5.8b-qlora-fast")

# ---------- 훈련 하이퍼파라미터 (빠른 학습용) ----------
MAX_SEQ_LEN = int(os.getenv("MAX_SEQ_LEN", "1024"))  # 시퀀스 길이 단축
LR = float(os.getenv("LR", "5e-4"))  # 학습률 증가
EPOCHS = float(os.getenv("EPOCHS", "0.5"))  # 에포크 수 대폭 감소
BATCH = int(os.getenv("BATCH", "2"))  # 배치 크기 증가
GRAD_ACC = int(os.getenv("GRAD_ACC", "4"))  # 그래디언트 누적 단축

# ---------- LoRA 설정 (빠른 학습용) ----------
LORA_R = int(os.getenv("LORA_R", "8"))  # LoRA rank 감소
LORA_ALPHA = int(os.getenv("LORA_ALPHA", "16"))  # LoRA alpha 감소
LORA_DROPOUT = float(os.getenv("LORA_DROPOUT", "0.1"))  # 드롭아웃 증가

# GPT-NeoX 계열 권장값 (간소화)
TARGET_MODULES = os.getenv(
    "TARGET_MODULES",
    "query_key_value"  # 핵심 모듈만 타겟팅
).split(",")

# ---------- 하드웨어 설정 ----------
DEVICE_MAP = os.getenv("DEVICE_MAP", "auto")
LOAD_IN_4BIT = os.getenv("LOAD_IN_4BIT", "true").lower() == "true"  # 4bit 양자화 사용
BF16 = os.getenv("BF16", "true").lower() == "true"

# ---------- 로깅 설정 (빠른 피드백) ----------
LOGGING_STEPS = int(os.getenv("LOGGING_STEPS", "10"))  # 더 자주 로깅
SAVE_STEPS = int(os.getenv("SAVE_STEPS", "100"))  # 더 자주 저장
EVAL_STEPS = int(os.getenv("EVAL_STEPS", "100"))  # 더 자주 평가
SAVE_TOTAL_LIMIT = int(os.getenv("SAVE_TOTAL_LIMIT", "1"))  # 체크포인트 수 감소

# ---------- 검증 설정 (빠른 검증) ----------
VAL_SPLIT_RATIO = float(os.getenv("VAL_SPLIT_RATIO", "0.1"))  # 검증 데이터 비율 증가
MIN_VAL_SIZE = int(os.getenv("MIN_VAL_SIZE", "20"))  # 최소 검증 데이터 감소
SEED = int(os.getenv("SEED", "42"))

# ---------- 프롬프트 템플릿 ----------
PROMPT_TEMPLATE = {
    "role": "지속가능보고서(SR) 작성 전문가",
    "instruction_prefix": "### 역할: 지속가능보고서(SR) 작성 전문가\n### 지시문:\n",
    "input_prefix": "### 입력:\n",
    "response_prefix": "### 응답:\n"
}

# ---------- 출력 설정 ----------
OUTPUT_FORMATS = ["adapter"]  # 어댑터만 저장 (병합 제외)
DEFAULT_OUTPUT_FORMAT = os.getenv("DEFAULT_OUTPUT_FORMAT", "adapter")

# ---------- 환경 설정 ----------
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
WANDB_PROJECT = os.getenv("WANDB_PROJECT", "sllm-gri-training-fast")
TENSORBOARD_DIR = os.getenv("TENSORBOARD_DIR", "./logs/tensorboard-fast")

# ---------- 빠른 학습 팁 ----------
FAST_TRAINING_TIPS = """
🚀 빠른 학습을 위한 설정:
1. 에포크 수: 0.5 (기존 2 → 0.5)
2. 시퀀스 길이: 1024 (기존 1536 → 1024)
3. 배치 크기: 2 (기존 1 → 2)
4. 그래디언트 누적: 4 (기존 8 → 4)
5. LoRA rank: 8 (기존 16 → 8)
6. 4bit 양자화: 활성화
7. 검증 데이터: 10% (기존 5% → 10%)

예상 학습 시간: 15-30분 (기존 3시간 → 15-30분)
"""
