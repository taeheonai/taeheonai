@echo off
echo SLLM Training Script for Windows
echo ================================

REM 가상환경 활성화 (필요한 경우)
REM call conda activate your_env_name
REM 또는
REM call .\venv\Scripts\activate

REM 환경 변수 설정
set MODEL_NAME=beomi/KoAlpaca-Polyglot-5.8B
set DATA_PATH=./data/gri_all.jsonl
set OUTPUT_DIR=./outputs/srlm-koalpaca-5.8b-qlora
set MAX_SEQ_LEN=1536
set LR=2e-4
set EPOCHS=2
set BATCH=1
set GRAD_ACC=8
set LORA_R=16
set LORA_ALPHA=32

echo Configuration:
echo Model: %MODEL_NAME%
echo Data: %DATA_PATH%
echo Output: %OUTPUT_DIR%
echo Epochs: %EPOCHS%
echo Learning Rate: %LR%
echo Batch Size: %BATCH%
echo LoRA R: %LORA_R%
echo LoRA Alpha: %LORA_ALPHA%
echo.

REM 드라이 런으로 설정 확인
echo Running dry-run to check configuration...
python run_training.py --dry-run

if %ERRORLEVEL% NEQ 0 (
    echo Configuration check failed!
    pause
    exit /b 1
)

echo.
echo Configuration check passed! Starting training...
echo.

REM 실제 훈련 실행
python run_training.py

if %ERRORLEVEL% NEQ 0 (
    echo Training failed!
    pause
    exit /b 1
)

echo.
echo Training completed successfully!
echo Check output directory: %OUTPUT_DIR%
pause
