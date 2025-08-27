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

# ---------- HL만도 데이터 추가 학습을 위한 설정 ----------
BASE_MODEL_PATH = "./outputs/srlm-koalpaca-5.8b-qlora"           # 기존 베이스 폴더
MERGED_MODEL_PATH = "./outputs/srlm-koalpaca-5.8b-qlora/merged"  # 기존 병합 모델
DATA_PATH = "./data/hlmando_2024_generic.jsonl"                  # HL만도 일반화 데이터
OUTPUT_DIR = "./outputs/srlm-koalpaca-5.8b-qlora"                # 기존 폴더에 덮어쓰기

# RTX 2080 8GB에 최적화된 설정
MAX_SEQ_LEN = 512        # 메모리 절약
LR          = 1e-4       # 기존 모델이므로 낮은 학습률
EPOCHS      = 2           # 충분한 학습을 위해 2 에포크
BATCH       = 1
GRAD_ACC    = 2           # 빠른 학습

# LoRA 설정 (기존과 동일)
LORA_R        = 16
LORA_ALPHA    = 32
LORA_DROPOUT  = 0.05
TARGET_MODULES = "query_key_value,dense_h_to_4h,dense_4h_to_h".split(",")

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
    print(f"HL만도 데이터 로딩 중: {path}")
    ds = load_dataset("json", data_files=path, split="train")
    print(f"로딩된 데이터: {len(ds)}개")
    
    # 37개 데이터는 작으므로 90/10 분할
    ds = ds.shuffle(seed=42)
    n = len(ds)
    val_size = max(3, int(n * 0.1))  # 최소 3개 검증 데이터
    
    ds_train = ds.select(range(0, n - val_size))
    ds_val   = ds.select(range(n - val_size, n))
    
    print(f"훈련 데이터: {len(ds_train)}개, 검증 데이터: {len(ds_val)}개")
    
    ds_train = ds_train.map(format_examples, remove_columns=ds_train.column_names)
    ds_val   = ds_val.map(format_examples, remove_columns=ds_val.column_names)
    return ds_train, ds_val

# ---------- 토크나이저/모델 ----------
def get_tokenizer_and_model():
    print("토크나이저 로딩 중...")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_PATH, use_fast=True)  # 베이스 폴더에서 토크나이저
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    print(f"기존 모델 로딩 중: {MERGED_MODEL_PATH}")
    model = AutoModelForCausalLM.from_pretrained(
        MERGED_MODEL_PATH,  # 병합 모델에서 모델
        torch_dtype=torch.bfloat16,
        device_map=None,
        trust_remote_code=True,
        low_cpu_mem_usage=True,
    )
    model.config.use_cache = False
    
    print("GPU로 모델 이동 중...")
    model = model.cuda()
    
    return tokenizer, model

# ---------- 메인 ----------
def main():
    print("🚀 기존 모델에 HL만도 데이터 추가 학습 시작!")
    print(f"베이스 모델: {BASE_MODEL_PATH}")
    print(f"병합 모델: {MERGED_MODEL_PATH}")
    print(f"추가 데이터: {DATA_PATH}")
    print(f"통합 출력: {OUTPUT_DIR}")
    print(f"시퀀스 길이: {MAX_SEQ_LEN}")
    print(f"에포크: {EPOCHS}")
    print(f"학습률: {LR}")
    print(f"그래디언트 누적: {GRAD_ACC}")
    
    # 경로 확인
    if not os.path.exists(BASE_MODEL_PATH):
        print(f"❌ 베이스 모델을 찾을 수 없습니다: {BASE_MODEL_PATH}")
        return
    
    if not os.path.exists(MERGED_MODEL_PATH):
        print(f"❌ 병합 모델을 찾을 수 없습니다: {MERGED_MODEL_PATH}")
        return
    
    if not os.path.exists(DATA_PATH):
        print(f"❌ 데이터 파일을 찾을 수 없습니다: {DATA_PATH}")
        return
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    tokenizer, model = get_tokenizer_and_model()

    train_ds, val_ds = load_and_prepare_dataset(DATA_PATH)

    print("LoRA 설정 중...")
    lora_cfg = LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        target_modules=TARGET_MODULES,
        bias="none",
        task_type="CAUSAL_LM"
    )

    print("학습 인수 설정 중...")
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        logging_steps=5,           # 더 자주 로깅
        save_steps=50,             # 더 자주 저장
        eval_steps=50,             # 더 자주 평가
        learning_rate=LR,
        lr_scheduler_type="cosine",
        warmup_ratio=0.1,
        weight_decay=0.01,
        num_train_epochs=EPOCHS,
        per_device_train_batch_size=BATCH,
        per_device_eval_batch_size=max(1, BATCH),
        gradient_accumulation_steps=GRAD_ACC,
        gradient_checkpointing=True,
        bf16=True,
        fp16=False,
        logging_dir=os.path.join(OUTPUT_DIR, "logs"),
        save_total_limit=2,        # 체크포인트 수 줄임
        evaluation_strategy="steps",
        do_eval=True,
        ddp_find_unused_parameters=False,
        remove_unused_columns=False,
        dataloader_pin_memory=False,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
    )

    print("SFTTrainer 설정 중...")
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

    print("기존 모델에 HL만도 데이터 추가 학습 시작! 🎯")
    trainer.train()
    
    print("어댑터 저장 중...")
    trainer.model.save_pretrained(os.path.join(OUTPUT_DIR, "adapter"))
    tokenizer.save_pretrained(OUTPUT_DIR)

    print("통합 모델 병합 중...")
    try:
        merged = trainer.model.merge_and_unload()
        merged.save_pretrained(os.path.join(OUTPUT_DIR, "merged"))
        print("✅ 통합 모델 저장 완료:", os.path.join(OUTPUT_DIR, "merged"))
    except Exception as e:
        print("⚠️ 병합 실패 (어댑터만 저장):", e)

    print(f"🎉 HL만도 데이터 추가 학습 완료! 출력: {OUTPUT_DIR}")
    print("이제 기존 GRI 데이터 + 한온시스템 데이터 + HL만도 데이터를 모두 학습한 통합 모델이 준비되었습니다!")

if __name__ == "__main__":
    main()
