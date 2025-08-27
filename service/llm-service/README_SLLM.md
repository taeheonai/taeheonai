# SLLM (Sustainable Language Learning Model) Training

이 서비스는 GRI(Global Reporting Initiative) 지속가능보고서 작성에 특화된 한국어 언어모델을 훈련하기 위한 것입니다.

## 🚀 주요 기능

- **KoAlpaca-Polyglot-5.8B** 모델 기반 훈련
- **QLoRA (Quantized LoRA)** 기반 효율적인 파인튜닝
- **GRI 데이터셋**을 활용한 지속가능보고서 작성 특화
- **4bit 양자화**로 메모리 효율성 극대화

## 📁 프로젝트 구조

```
slm-service/
├── data/                           # 훈련 데이터
│   └── gri_all.jsonl             # GRI 데이터셋
├── outputs/                        # 훈련 결과물
│   └── srlm-koalpaca-5.8b-qlora/ # 모델 출력
├── train_sllm_koalpaca_qlora.py  # 메인 훈련 스크립트
├── train_config.py                # 훈련 설정
├── run_training.py                # 훈련 실행 스크립트
├── run_training.bat               # Windows 배치 파일
├── env.example                    # 환경 변수 예시
└── requirements.txt               # Python 의존성
```

## 🛠️ 설치 및 설정

### ⚠️ 중요: Python 버전 요구사항

**Python 3.11**을 사용해야 합니다. Python 3.13은 일부 라이브러리와 호환성 문제가 있을 수 있습니다.

### 1. Python 3.11 환경 설정

#### 방법 A: Conda 사용 (권장)
```bash
# Python 3.11 환경 생성
conda create -n sllm python=3.11

# 환경 활성화
conda activate sllm

# 환경 확인
python --version  # Python 3.11.x 출력 확인
```

#### 방법 B: 가상환경 사용
```bash
# Python 3.11 가상환경 생성
python3.11 -m venv sllm_env

# 환경 활성화 (Windows)
sllm_env\Scripts\activate

# 환경 확인
python --version  # Python 3.11.x 출력 확인
```

### 2. 의존성 설치

```bash
# pip 업그레이드
pip install --upgrade pip

# 의존성 설치
pip install -r requirements.txt
```

### 3. 환경 변수 설정

```bash
# env.example을 .env로 복사
cp env.example .env

# .env 파일을 편집하여 필요한 값 설정
```

### 4. 데이터 준비

GRI 데이터셋이 `data/gri_all.jsonl`에 위치해야 합니다.

## 🎯 훈련 실행

### 방법 1: Python 스크립트 직접 실행

```bash
# 기본 설정으로 훈련
python run_training.py

# 커스텀 설정으로 훈련
python run_training.py \
    --model "beomi/KoAlpaca-Polyglot-5.8B" \
    --epochs 3 \
    --lr 1e-4 \
    --batch 2
```

### 방법 2: Windows 배치 파일 실행

```bash
# run_training.bat 더블클릭 또는
run_training.bat
```

### 방법 3: 환경 변수로 설정

```bash
export MODEL_NAME="beomi/KoAlpaca-Polyglot-5.8B"
export EPOCHS=3
export LR=1e-4
python run_training.py
```

## ⚙️ 주요 설정 옵션

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `--model` | KoAlpaca-Polyglot-5.8B | 사용할 모델 |
| `--epochs` | 2 | 훈련 에포크 수 |
| `--lr` | 2e-4 | 학습률 |
| `--batch` | 1 | 배치 크기 |
| `--max-seq-len` | 1536 | 최대 시퀀스 길이 |
| `--lora-r` | 16 | LoRA rank |
| `--lora-alpha` | 32 | LoRA alpha |

## 🔧 하드웨어 요구사항

### 최소 요구사항
- **GPU**: 8GB VRAM (4bit 양자화 사용 시)
- **RAM**: 16GB
- **저장공간**: 20GB

### 권장 사항
- **GPU**: 16GB+ VRAM
- **RAM**: 32GB+
- **저장공간**: 50GB+

## 📊 훈련 모니터링

### 로그 확인
```bash
# 훈련 로그
tail -f training.log

# TensorBoard (선택사항)
tensorboard --logdir ./outputs/srlm-koalpaca-5.8b-qlora/logs
```

### 출력 파일
- `adapter/`: LoRA 어댑터 가중치
- `merged/`: 베이스 모델 + 어댑터 병합
- `logs/`: 훈련 로그 및 메트릭

## 🚨 문제 해결

### 일반적인 오류

1. **Python 버전 오류**
   ```bash
   # Python 3.11 환경 확인
   python --version
   
   # 올바른 환경 활성화
   conda activate sllm  # 또는
   sllm_env\Scripts\activate
   ```

2. **CUDA 메모리 부족**
   ```bash
   # 배치 크기 줄이기
   --batch 1
   
   # 시퀀스 길이 줄이기
   --max-seq-len 1024
   ```

3. **모델 다운로드 실패**
   ```bash
   # 인터넷 연결 확인
   # Hugging Face 토큰 설정 (필요시)
   export HF_TOKEN="your_token"
   ```

4. **데이터 로딩 오류**
   ```bash
   # 데이터 파일 경로 확인
   # JSON 형식 검증
   python -c "import json; [json.loads(l) for l in open('data/gri_all.jsonl')]"
   ```

## 📈 성능 최적화 팁

1. **LoRA 설정 조정**
   - `--lora-r`: 8-32 범위에서 실험
   - `--lora-alpha`: 보통 r의 2배

2. **배치 크기 최적화**
   - GPU 메모리에 맞춰 조정
   - `--grad-acc`로 효과적 배치 크기 조절

3. **학습률 스케줄링**
   - `--warmup-ratio`로 워밍업 조정
   - `--lr-scheduler-type`으로 스케줄러 선택

## 🔗 참고 자료

- [KoAlpaca-Polyglot-5.8B](https://huggingface.co/beomi/KoAlpaca-Polyglot-5.8B)
- [QLoRA Paper](https://arxiv.org/abs/2305.14314)
- [PEFT Documentation](https://huggingface.co/docs/peft)
- [TRL Documentation](https://huggingface.co/docs/trl)

## 📞 지원

문제가 발생하거나 질문이 있으시면:
1. Python 버전 확인 (3.11 사용)
2. 로그 파일 확인
3. 설정 값 검증
4. 하드웨어 요구사항 확인
5. GitHub 이슈 등록
