from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException, APIRouter, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy.orm import Session
import uvicorn
import logging
import traceback
import os
import hashlib

from .database import get_db, engine, Base
from .models import User
from .router.auth_router import auth_router

# 데이터베이스 테이블 생성 (연결 실패 시 무시)
try:
    if engine:
        Base.metadata.create_all(bind=engine)
        logging.info("Database tables created successfully")
    else:
        logging.warning("Database engine not available, skipping table creation")
except Exception as e:
    logging.error(f"Failed to create database tables: {e}")
    # 로컬 개발 환경에서는 데이터베이스 없이도 동작하도록 설정
    logging.info("Continuing without database for local development")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("auth_main")

# 로컬 개발 환경에서 .env 파일 로드
load_dotenv()

app = FastAPI(
    title="Auth Service API",
    description="Authentication 서비스",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # 로컬 접근
        "http://127.0.0.1:3000",  # 로컬 IP 접근
        "http://frontend:3000",   # Docker 내부 네트워크
        "https://taeheonai.com",  # 프로덕션 도메인
        "http://taeheonai.com",   # 프로덕션 도메인
    ],
    allow_credentials=True,  # HttpOnly 쿠키 사용을 위해 필수
    allow_methods=["*"],
    allow_headers=["*"],
)

# 데이터베이스 상태 확인을 위한 import
from .database import engine

# 라우터를 앱에 포함
app.include_router(auth_router)

# Docker health check를 위한 루트 레벨 /health 엔드포인트
@app.get("/health")
async def root_health_check():
    """Docker health check용 루트 레벨 헬스체크"""
    from .database import engine
    db_status = "connected" if engine else "disconnected"
    return {
        "status": "healthy",
        "service": "auth-service",
        "database": db_status,
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"📥 요청: {request.method} {request.url.path} (클라이언트: {request.client.host})")
    try:
        response = await call_next(request)
        logger.info(f"📤 응답: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"❌ 요청 처리 중 오류: {str(e)}")
        logger.error(traceback.format_exc())
        raise

if __name__ == "__main__":
    logger.info(f"💻 개발 모드로 실행 - 포트: 8008")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8008,
        reload=True,
        log_level="info"
    ) 