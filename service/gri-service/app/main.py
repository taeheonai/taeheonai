from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import logging
import os

# 데이터베이스 관련 import
from app.common.database import init_database, check_database_connection

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="GRI Service",
    description="GRI Standards Service for TaeheonAI",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://taeheonai.com", "http://taeheonai.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 애플리케이션 시작 시 데이터베이스 초기화
@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 데이터베이스를 초기화합니다."""
    try:
        logger.info("🚀 GRI Service 시작 - 데이터베이스 초기화 중...")
        
        # 데이터베이스 초기화 (테이블 생성 포함)
        if await init_database():
            logger.info("✅ 데이터베이스 초기화 완료!")
        else:
            logger.error("❌ 데이터베이스 초기화 실패!")
            
    except Exception as e:
        logger.error(f"❌ 애플리케이션 시작 시 오류: {e}")

# APIRouter 정의
from app.router import gri_router

# 데이터베이스 상태 확인 엔드포인트 (gri_router에 포함됨)
async def check_db_status():
    """데이터베이스 상태 확인"""
    try:
        connection_ok = await check_database_connection()
        return {
            "status": "success" if connection_ok else "failed",
            "service": "gri-service",
            "database": "Railway PostgreSQL",
            "connection": "connected" if connection_ok else "disconnected",
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        logger.error(f"Database status check failed: {e}")
        return {
            "status": "error",
            "service": "gri-service",
            "database": "Railway PostgreSQL",
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
        }

# 라우터를 앱에 포함
app.include_router(gri_router)

if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.getenv("PORT", 8003))
    uvicorn.run(app, host="0.0.0.0", port=port) 