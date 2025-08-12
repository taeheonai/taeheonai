from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException, APIRouter, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
import uvicorn
import logging
import traceback
import os
import hashlib

from .database import get_db, engine, Base, check_database_connection, test_database_connection
from .models import User
from .router.auth_router import auth_router

# 로깅 설정 강화
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # 콘솔 출력
        logging.FileHandler('/tmp/auth-service.log')  # 파일 출력 (Docker에서 확인 가능)
    ]
)

# 루트 로거 설정
root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)

# auth_main 로거 설정
logger = logging.getLogger("auth_main")
logger.setLevel(logging.INFO)

# 데이터베이스 테이블 생성 (연결 실패 시 무시)
try:
    if engine:
        # Async 엔진이므로 테이블 생성은 나중에 처리
        logger.info("Async Database engine available, tables will be created on first connection")
    else:
        logger.warning("Database engine not available, skipping table creation")
except Exception as e:
    logger.error(f"Failed to create database tables: {e}")
    # 로컬 개발 환경에서는 데이터베이스 없이도 동작하도록 설정
    logger.info("Continuing without database for local development")

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
        "https://www.taeheonai.com",  # www 서브도메인 추가
    ],
    allow_credentials=True,  # HttpOnly 쿠키 사용을 위해 필수
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # OPTIONS 명시적 추가
    allow_headers=["*"],
)

# 데이터베이스 상태 확인을 위한 import
from .database import engine

# 라우터를 앱에 포함
app.include_router(auth_router)

# CORS preflight 요청을 위한 OPTIONS 핸들러
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    """CORS preflight 요청을 처리하는 핸들러"""
    logger.info(f"�� OPTIONS preflight 요청 처리: /{full_path}")
    return {"message": "CORS preflight OK"}

# Docker health check를 위한 루트 레벨 /health 엔드포인트
@app.get("/health")
async def root_health_check():
    """Docker health check용 루트 레벨 헬스체크"""
    from .database import engine
    db_status = "connected" if engine else "disconnected"
    logger.info(f"🏥 헬스체크 요청 - DB 상태: {db_status}")
    return {
        "status": "healthy",
        "service": "auth-service",
        "database": db_status,
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

# Railway PostgreSQL 연결 상태 상세 확인 엔드포인트
@app.get("/db-status")
async def database_status_check():
    """Railway PostgreSQL 연결 상태를 상세하게 확인하는 엔드포인트"""
    try:
        connection_ok = await check_database_connection()
        logger.info(f"🔍 DB 상태 확인 요청 - 연결 상태: {connection_ok}")
        return {
            "status": "success" if connection_ok else "failed",
            "service": "auth-service",
            "database": "Railway PostgreSQL",
            "connection": "connected" if connection_ok else "disconnected",
            "timestamp": datetime.now().isoformat(),
            "details": {
                "engine_available": engine is not None,
                "connection_test": connection_ok
            }
        }
    except Exception as e:
        logger.error(f"Database status check failed: {e}")
        return {
            "status": "error",
            "service": "auth-service",
            "database": "Railway PostgreSQL",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# 데이터베이스 연결 테스트 엔드포인트
@app.get("/db-test")
async def database_test():
    """Railway PostgreSQL 연결을 테스트하는 엔드포인트"""
    try:
        logger.info("🧪 DB 연결 테스트 요청")
        test_result = await test_database_connection()
        logger.info(f"🧪 DB 연결 테스트 결과: {test_result}")
        return {
            "status": "success" if test_result else "failed",
            "service": "auth-service",
            "database": "Railway PostgreSQL",
            "test_result": test_result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Database test failed: {e}")
        return {
            "status": "error",
            "service": "auth-service",
            "database": "Railway PostgreSQL",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
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