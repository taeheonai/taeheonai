"""
SLLM 훈련 설정 파일
환경변수나 설정값을 중앙에서 관리
"""

import os
from typing import List

# ---------- 모델 설정 ----------
MODEL_NAME = os.getenv("MODEL_NAME", "beomi/KoAlpaca-Polyglot-5.8B")

# ---------- 데이터 설정 ----------
DATA_PATH = os.getenv("DATA_PATH", "./data/gri_all.jsonl")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./outputs/srlm-koalpaca-5.8b-qlora")

# ---------- 훈련 하이퍼파라미터 ----------
MAX_SEQ_LEN = int(os.getenv("MAX_SEQ_LEN", "1536"))
LR = float(os.getenv("LR", "2e-4"))
EPOCHS = float(os.getenv("EPOCHS", "2"))
BATCH = int(os.getenv("BATCH", "1"))
GRAD_ACC = int(os.getenv("GRAD_ACC", "8"))

# ---------- LoRA 설정 ----------
LORA_R = int(os.getenv("LORA_R", "16"))
LORA_ALPHA = int(os.getenv("LORA_ALPHA", "32"))
LORA_DROPOUT = float(os.getenv("LORA_DROPOUT", "0.05"))

# GPT-NeoX 계열 권장값
TARGET_MODULES = os.getenv(
    "TARGET_MODULES",
    "query_key_value,dense_h_to_4h,dense_4h_to_h"
).split(",")

# ---------- 하드웨어 설정 ----------
DEVICE_MAP = os.getenv("DEVICE_MAP", "auto")
LOAD_IN_4BIT = os.getenv("LOAD_IN_4BIT", "true").lower() == "true"
BF16 = os.getenv("BF16", "true").lower() == "true"

# ---------- 로깅 설정 ----------
LOGGING_STEPS = int(os.getenv("LOGGING_STEPS", "25"))
SAVE_STEPS = int(os.getenv("SAVE_STEPS", "500"))
EVAL_STEPS = int(os.getenv("EVAL_STEPS", "500"))
SAVE_TOTAL_LIMIT = int(os.getenv("SAVE_TOTAL_LIMIT", "2"))

# ---------- 검증 설정 ----------
VAL_SPLIT_RATIO = float(os.getenv("VAL_SPLIT_RATIO", "0.05"))
MIN_VAL_SIZE = int(os.getenv("MIN_VAL_SIZE", "50"))
SEED = int(os.getenv("SEED", "42"))

# ---------- 프롬프트 템플릿 ----------
PROMPT_TEMPLATE = {
    "role": "지속가능보고서(SR) 작성 전문가",
    "instruction_prefix": "### 역할: 지속가능보고서(SR) 작성 전문가\n### 지시문:\n",
    "input_prefix": "### 입력:\n",
    "response_prefix": "### 응답:\n"
}

# ---------- 출력 설정 ----------
OUTPUT_FORMATS = ["adapter", "merged", "full_model"]
DEFAULT_OUTPUT_FORMAT = os.getenv("DEFAULT_OUTPUT_FORMAT", "adapter")

# ---------- 환경 설정 ----------
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
WANDB_PROJECT = os.getenv("WANDB_PROJECT", "sllm-gri-training")
TENSORBOARD_DIR = os.getenv("TENSORBOARD_DIR", "./logs/tensorboard")
