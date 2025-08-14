from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
import uvicorn
import logging
import traceback
import os
import tempfile

from .database import get_db, engine, check_database_connection, test_database_connection, init_database, check_tables_status
from .router.auth_router import auth_router

# ---------- 로깅 설정 ----------
log_dir = tempfile.gettempdir()
log_path = os.path.join(log_dir, "auth-service.log")

root_logger = logging.getLogger()
if not root_logger.handlers:  # ✅ 중복 핸들러 방지
    root_logger.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

    sh = logging.StreamHandler()
    sh.setLevel(logging.INFO)
    sh.setFormatter(formatter)
    root_logger.addHandler(sh)

    try:
        fh = logging.FileHandler(log_path, encoding="utf-8")
        fh.setLevel(logging.INFO)
        fh.setFormatter(formatter)
        root_logger.addHandler(fh)
    except Exception as e:
        # 파일 핸들러 실패해도 콘솔 로깅은 유지
        root_logger.warning(f"FileHandler init failed: {e}")

logger = logging.getLogger("auth_main")
logger.setLevel(logging.INFO)

# ---------- .env ----------
load_dotenv()

# ---------- FastAPI ----------
app = FastAPI(
    title="Auth Service API",
    description="Authentication 서비스",
    version="1.0.0",
)

# ---------- CORS ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # 로컬
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://frontend:3000",
        # 프로덕션
        "https://taeheonai.com",
        "http://taeheonai.com",
        "https://www.taeheonai.com",
        "http://www.taeheonai.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],  # ✅ PATCH 추가
    allow_headers=["*"],
)

# ---------- 라우터 ----------
app.include_router(auth_router)  # prefix 제거 (auth_router에 이미 있음)

# ---------- 애플리케이션 시작 시 데이터베이스 초기화 ----------
@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 데이터베이스를 초기화합니다."""
    try:
        logger.info("🚀 Auth Service 시작 - 데이터베이스 초기화 중...")
        
        # 데이터베이스 초기화 (테이블 생성 포함)
        if await init_database():
            logger.info("✅ 데이터베이스 초기화 완료!")
            
            # 테이블 상태 확인
            await check_tables_status()
        else:
            logger.error("❌ 데이터베이스 초기화 실패!")
            
    except Exception as e:
        logger.error(f"❌ 애플리케이션 시작 시 오류: {e}")
        logger.error(traceback.format_exc())

# ---------- 헬스/DB ----------
@app.get("/health")
async def root_health_check():
    db_status = "connected" if engine else "disconnected"
    logger.info(f"🏥 헬스체크 요청 - DB 상태: {db_status}")
    return {
        "status": "healthy",
        "service": "auth-service",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),  # ✅ UTC
        "version": "1.0.0",
    }

@app.get("/db-status")
async def database_status_check():
    try:
        connection_ok = await check_database_connection()
        logger.info(f"🔍 DB 상태 확인 요청 - 연결 상태: {connection_ok}")
        return {
            "status": "success" if connection_ok else "failed",
            "service": "auth-service",
            "database": "Railway PostgreSQL",
            "connection": "connected" if connection_ok else "disconnected",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": {
                "engine_available": engine is not None,
                "connection_test": connection_ok,
            },
        }
    except Exception as e:
        logger.error(f"Database status check failed: {e}")
        return {
            "status": "error",
            "service": "auth-service",
            "database": "Railway PostgreSQL",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

@app.get("/db-test")
async def database_test():
    try:
        logger.info("🧪 DB 연결 테스트 요청")
        test_result = await test_database_connection()
        logger.info(f"🧪 DB 연결 테스트 결과: {test_result}")
        return {
            "status": "success" if test_result else "failed",
            "service": "auth-service",
            "database": "Railway PostgreSQL",
            "test_result": test_result,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        logger.error(f"Database test failed: {e}")
        return {
            "status": "error",
            "service": "auth-service",
            "database": "Railway PostgreSQL",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

# ---------- 요청 로깅 미들웨어 ----------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = datetime.now().timestamp()
    client = request.client.host if request.client else "unknown"
    logger.info(f"📥 요청: {request.method} {request.url.path} (클라이언트: {client})")
    try:
        response = await call_next(request)
        took_ms = (datetime.now().timestamp() - start) * 1000
        logger.info(f"📤 응답: {response.status_code} ({took_ms:.1f} ms)")
        return response
    except Exception as e:
        logger.error(f"❌ 요청 처리 중 오류: {str(e)}")
        logger.error(traceback.format_exc())
        raise

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8008))
    logger.info(f"💻 개발 모드로 실행 - 포트: {port}, 로그: {log_path}")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info",
    )