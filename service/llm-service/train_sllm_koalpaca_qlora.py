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

# ---------- 설정 ----------
MODEL_NAME = os.getenv("MODEL_NAME", "beomi/KoAlpaca-Polyglot-5.8B")
DATA_PATH  = os.getenv("DATA_PATH", "./data/gri_all.jsonl")   # 상대 경로로 변경
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./outputs/srlm-koalpaca-5.8b-qlora")

MAX_SEQ_LEN = int(os.getenv("MAX_SEQ_LEN", "1024"))  # RTX 2080 8GB에 최적화
LR          = float(os.getenv("LR", "2e-4"))
EPOCHS      = float(os.getenv("EPOCHS", "1"))
BATCH       = int(os.getenv("BATCH", "1"))   # per_device_train_batch_size
GRAD_ACC    = int(os.getenv("GRAD_ACC", "4"))

# LoRA 설정(GPT-NeoX 계열 권장값)
LORA_R        = int(os.getenv("LORA_R", "16"))
LORA_ALPHA    = int(os.getenv("LORA_ALPHA", "32"))
LORA_DROPOUT  = float(os.getenv("LORA_DROPOUT", "0.05"))
# GPT-NeoX에서 흔히 쓰는 후보. 문제가 있으면 ["query_key_value"]만 유지해도 됨.
TARGET_MODULES = os.getenv(
    "TARGET_MODULES",
    "query_key_value,dense_h_to_4h,dense_4h_to_h"
).split(",")

# ---------- 데이터 로딩 & 프롬프트 템플릿 ----------
def build_prompt(instruction: str, user_input: Optional[str]) -> str:
    # SR 보고서 작성에 맞춘 한글 템플릿
    # 필요하면 회사/산업 컨텍스트 등을 추가해도 됨.
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
    # 기대 키: instruction, input, answer (output -> answer로 변경)
    instr = example.get("instruction", "")
    inpt  = example.get("input", "")
    out   = example.get("answer", "")  # answer 필드 사용
    example["text"] = build_prompt(instr, inpt) + out.strip()
    return example

def load_and_prepare_dataset(path: str):
    # jsonl 파일에서 train/val 스플릿
    ds = load_dataset("json", data_files=path, split="train")  # 전부 로드
    # 셔플 후 95/5 분할
    ds = ds.shuffle(seed=42)
    n  = len(ds)
    val_size = max(10, int(n * 0.05))  # 최소 10개 검증 데이터
    ds_train = ds.select(range(0, n - val_size))
    ds_val   = ds.select(range(n - val_size, n))

    ds_train = ds_train.map(format_examples, remove_columns=ds_train.column_names)
    ds_val   = ds_val.map(format_examples,   remove_columns=ds_val.column_names)
    return ds_train, ds_val

# ---------- 토크나이저/모델 ----------
def get_tokenizer_and_model():
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # 4bit 양자화 대신 16bit로 로드 (메모리 사용량 증가하지만 안정적)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        torch_dtype=torch.bfloat16,  # bfloat16 사용 (FP16보다 안정적)
        device_map=None,  # device_map 비활성화
        trust_remote_code=True,  # 일부 gpt_neox 변형 호환
        low_cpu_mem_usage=True,  # CPU 메모리 절약
    )
    model.config.use_cache = False  # grad_checkpointing와 충돌 방지
    
    # 모델을 GPU로 이동
    model = model.cuda()
    
    return tokenizer, model

# ---------- 메인 ----------
def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    tokenizer, model = get_tokenizer_and_model()

    train_ds, val_ds = load_and_prepare_dataset(DATA_PATH)

    lora_cfg = LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        target_modules=TARGET_MODULES,
        bias="none",
        task_type="CAUSAL_LM"
    )

    # 최신 trl 버전에 맞게 TrainingArguments 사용
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        logging_steps=10,  # 더 자주 로깅
        save_steps=100,    # 더 자주 저장
        eval_steps=100,    # 더 자주 평가
        learning_rate=LR,
        lr_scheduler_type="cosine",
        warmup_ratio=0.1,  # 워밍업 비율 증가
        weight_decay=0.01, # 가중치 감쇠 추가
        num_train_epochs=EPOCHS,
        per_device_train_batch_size=BATCH,
        per_device_eval_batch_size=max(1, BATCH),
        gradient_accumulation_steps=GRAD_ACC,
        gradient_checkpointing=True,
        bf16=True,  # bfloat16 사용
        fp16=False,  # fp16 비활성화
        logging_dir=os.path.join(OUTPUT_DIR, "logs"),
        save_total_limit=3,  # 더 많은 체크포인트 저장
        evaluation_strategy="steps",
        do_eval=True,
        ddp_find_unused_parameters=False,
        remove_unused_columns=False,  # SFTTrainer에서 필요
        dataloader_pin_memory=False,  # 메모리 효율성
        load_best_model_at_end=True,  # 최고 성능 모델 로드
        metric_for_best_model="eval_loss",  # 평가 지표
        greater_is_better=False,  # 손실은 낮을수록 좋음
    )

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        peft_config=lora_cfg,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        dataset_text_field="text",
        args=training_args,
        max_seq_length=MAX_SEQ_LEN,
        packing=True,  # 짧은 예시 패킹으로 효율↑
    )

    trainer.train()
    # 어댑터 저장
    trainer.model.save_pretrained(os.path.join(OUTPUT_DIR, "adapter"))
    tokenizer.save_pretrained(OUTPUT_DIR)

    # (선택) 베이스+어댑터 병합해서 단일 가중치로 저장
    try:
        merged = trainer.model.merge_and_unload()
        merged.save_pretrained(os.path.join(OUTPUT_DIR, "merged"))
        print("Merged model saved to:", os.path.join(OUTPUT_DIR, "merged"))
    except Exception as e:
        print("Skip merge (adapter만 저장). Reason:", e)

    print("Done. Output:", OUTPUT_DIR)

if __name__ == "__main__":
    main()
