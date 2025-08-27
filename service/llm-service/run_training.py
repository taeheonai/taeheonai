#!/usr/bin/env python3
"""
SLLM 훈련 실행 스크립트
환경 설정 및 훈련 실행을 담당
"""

import os
import sys
import argparse
import logging
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from train_sllm_koalpaca_qlora import main as train_main
from train_config import *

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('training.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def setup_environment():
    """환경 설정 및 검증"""
    logger.info("환경 설정을 확인합니다...")
    
    # 데이터 파일 존재 확인
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"데이터 파일을 찾을 수 없습니다: {DATA_PATH}")
    
    # 출력 디렉토리 생성
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_DIR, "logs"), exist_ok=True)
    
    # GPU 사용 가능 여부 확인
    try:
        import torch
        if torch.cuda.is_available():
            logger.info(f"GPU 사용 가능: {torch.cuda.get_device_name(0)}")
            logger.info(f"GPU 메모리: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
        else:
            logger.warning("GPU를 사용할 수 없습니다. CPU 모드로 실행됩니다.")
    except ImportError:
        logger.warning("PyTorch가 설치되지 않았습니다. GPU 확인을 건너뜁니다.")
    
    logger.info("환경 설정이 완료되었습니다.")

def parse_arguments():
    """명령행 인수 파싱"""
    parser = argparse.ArgumentParser(description="SLLM 훈련 실행")
    
    parser.add_argument("--model", type=str, default=MODEL_NAME,
                       help="사용할 모델 이름")
    parser.add_argument("--data", type=str, default=DATA_PATH,
                       help="훈련 데이터 경로")
    parser.add_argument("--output", type=str, default=OUTPUT_DIR,
                       help="출력 디렉토리")
    parser.add_argument("--epochs", type=float, default=EPOCHS,
                       help="훈련 에포크 수")
    parser.add_argument("--lr", type=float, default=LR,
                       help="학습률")
    parser.add_argument("--batch", type=int, default=BATCH,
                       help="배치 크기")
    parser.add_argument("--max-seq-len", type=int, default=MAX_SEQ_LEN,
                       help="최대 시퀀스 길이")
    parser.add_argument("--lora-r", type=int, default=LORA_R,
                       help="LoRA rank")
    parser.add_argument("--lora-alpha", type=int, default=LORA_ALPHA,
                       help="LoRA alpha")
    parser.add_argument("--dry-run", action="store_true",
                       help="실제 훈련 없이 설정만 확인")
    
    return parser.parse_args()

def main():
    """메인 함수"""
    try:
        # 명령행 인수 파싱
        args = parse_arguments()
        
        # 환경변수 설정
        os.environ["MODEL_NAME"] = args.model
        os.environ["DATA_PATH"] = args.data
        os.environ["OUTPUT_DIR"] = args.output
        os.environ["EPOCHS"] = str(args.epochs)
        os.environ["LR"] = str(args.lr)
        os.environ["BATCH"] = str(args.batch)
        os.environ["MAX_SEQ_LEN"] = str(args.max_seq_len)
        os.environ["LORA_R"] = str(args.lora_r)
        os.environ["LORA_ALPHA"] = str(args.lora_alpha)
        
        # 환경 설정
        setup_environment()
        
        if args.dry_run:
            logger.info("드라이 런 모드: 설정만 확인합니다.")
            logger.info(f"모델: {args.model}")
            logger.info(f"데이터: {args.data}")
            logger.info(f"출력: {args.output}")
            logger.info(f"에포크: {args.epochs}")
            logger.info(f"학습률: {args.lr}")
            logger.info(f"배치: {args.batch}")
            logger.info(f"시퀀스 길이: {args.max_seq_len}")
            logger.info(f"LoRA R: {args.lora_r}")
            logger.info(f"LoRA Alpha: {args.lora_alpha}")
            return
        
        # 훈련 실행
        logger.info("훈련을 시작합니다...")
        train_main()
        logger.info("훈련이 완료되었습니다!")
        
    except Exception as e:
        logger.error(f"훈련 중 오류가 발생했습니다: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
