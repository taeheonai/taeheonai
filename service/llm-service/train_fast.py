#!/usr/bin/env python3
"""
빠른 학습을 위한 SLLM 훈련 스크립트
학습 시간을 단축하기 위해 최적화됨
"""

import os, json, math, random
from dataclasses import dataclass
from typing import Dict, Optional, List

import torch
from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
)
from trl import SFTTrainer
from peft import LoraConfig

# ---------- 빠른 학습 설정 ----------
MODEL_NAME = "beomi/KoAlpaca-Polyglot-5.8B"
DATA_PATH  = "./data/gri_all.jsonl"
OUTPUT_DIR = "./outputs/srlm-koalpaca-5.8b-qlora-fast"

# 빠른 학습을 위한 하이퍼파라미터
MAX_SEQ_LEN = 1024  # 시퀀스 길이 단축
LR          = 5e-4  # 학습률 증가
EPOCHS      = 0.5   # 에포크 수 대폭 감소
BATCH       = 2     # 배치 크기 증가
GRAD_ACC    = 4     # 그래디언트 누적 단축

# LoRA 설정 (빠른 학습용)
LORA_R        = 8   # LoRA rank 감소
LORA_ALPHA    = 16  # LoRA alpha 감소
LORA_DROPOUT  = 0.1 # 드롭아웃 증가
TARGET_MODULES = ["query_key_value"]  # 핵심 모듈만 타겟팅

print("🚀 빠른 학습 설정:")
print(f"  에포크: {EPOCHS}")
print(f"  배치 크기: {BATCH}")
print(f"  시퀀스 길이: {MAX_SEQ_LEN}")
print(f"  예상 시간: 15-30분")

# ---------- 데이터 로딩 & 프롬프트 템플릿 ----------
def build_prompt(instruction: str, user_input: Optional[str]) -> str:
    header = (
        "### 역할: 지속가능보고서(SR) 작성 전문가\n"
        "### 지시문:\n"
        f"{instruction.strip()}\n\n"
    )
    if user_input and user_input.strip():
        header += "### 입력:\n" + user_input.strip() + "\n\n"
    header += "### 응답:\n"
    return header

def format_examples(example: Dict) -> Dict:
    instr = example.get("instruction", "")
    inpt  = example.get("input", "")
    out   = example.get("answer", "")
    example["text"] = build_prompt(instr, inpt) + out.strip()
    return example

def load_and_prepare_dataset(path: str):
    print("📊 데이터 로딩 중...")
    ds = load_dataset("json", data_files=path, split="train")
    
    # 빠른 학습을 위해 데이터 크기 제한
    if len(ds) > 1000:
        print(f"⚠️  데이터가 너무 큽니다. 처음 1000개만 사용합니다.")
        ds = ds.select(range(1000))
    
    ds = ds.shuffle(seed=42)
    n  = len(ds)
    val_size = max(20, int(n * 0.1))  # 검증 데이터 10%
    ds_train = ds.select(range(0, n - val_size))
    ds_val   = ds.select(range(n - val_size, n))

    print(f"📈 훈련 데이터: {len(ds_train)}개")
    print(f"📊 검증 데이터: {len(ds_val)}개")

    ds_train = ds_train.map(format_examples, remove_columns=ds_train.column_names)
    ds_val   = ds_val.map(format_examples, remove_columns=ds_val.column_names)
    return ds_train, ds_val

# ---------- 토크나이저/모델 ----------
def get_tokenizer_and_model():
    print("🤖 모델 로딩 중...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # 4bit 양자화로 메모리 절약 및 속도 향상
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        torch_dtype=torch.bfloat16,
        device_map="auto",  # 자동 디바이스 매핑
        trust_remote_code=True,
        low_cpu_mem_usage=True,
        load_in_4bit=True,  # 4bit 양자화 활성화
        bnb_4bit_compute_dtype=torch.bfloat16,
    )
    model.config.use_cache = False
    
    print("✅ 모델 로딩 완료!")
    return tokenizer, model

# ---------- 메인 ----------
def main():
    print("🚀 빠른 SLLM 훈련 시작!")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    tokenizer, model = get_tokenizer_and_model()
    train_ds, val_ds = load_and_prepare_dataset(DATA_PATH)

    # 빠른 학습을 위한 LoRA 설정
    lora_cfg = LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        target_modules=TARGET_MODULES,
        bias="none",
        task_type="CAUSAL_LM"
    )

    # 빠른 학습을 위한 훈련 인수
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        logging_steps=5,      # 더 자주 로깅
        save_steps=50,        # 더 자주 저장
        eval_steps=50,        # 더 자주 평가
        learning_rate=LR,
        lr_scheduler_type="cosine",
        warmup_ratio=0.1,
        weight_decay=0.01,
        num_train_epochs=EPOCHS,
        per_device_train_batch_size=BATCH,
        per_device_eval_batch_size=BATCH,
        gradient_accumulation_steps=GRAD_ACC,
        gradient_checkpointing=True,
        bf16=True,
        fp16=False,
        logging_dir=os.path.join(OUTPUT_DIR, "logs"),
        save_total_limit=1,   # 체크포인트 1개만 저장
        evaluation_strategy="steps",
        do_eval=True,
        ddp_find_unused_parameters=False,
        remove_unused_columns=False,
        dataloader_pin_memory=False,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        # 빠른 학습을 위한 추가 설정
        dataloader_num_workers=0,  # Windows 호환성
        report_to=None,  # wandb 비활성화로 속도 향상
    )

    print("🎯 훈련 시작!")
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        peft_config=lora_cfg,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        dataset_text_field="text",
        args=training_args,
        max_seq_length=MAX_SEQ_LEN,
        packing=True,
    )

    trainer.train()
    
    # 어댑터만 저장 (병합 제외로 시간 절약)
    print("💾 어댑터 저장 중...")
    trainer.model.save_pretrained(os.path.join(OUTPUT_DIR, "adapter"))
    tokenizer.save_pretrained(OUTPUT_DIR)
    
    print(f"🎉 빠른 훈련 완료! 출력: {OUTPUT_DIR}")
    print("⏱️  예상 시간: 15-30분 (기존 3시간 대비 90% 단축)")

if __name__ == "__main__":
    main()
