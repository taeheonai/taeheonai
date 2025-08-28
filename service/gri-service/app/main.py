from fastapi import FastAPI, HTTPException, APIRouter, Request
# from fastapi.middleware.cors import CORSMiddleware  # 🚨 CORS 제거로 인해 불필요
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime
import logging
import os
import traceback

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

# 🚨 CORS 제거: Gateway에서만 CORS 처리 (브라우저가 직접 호출하지 않음)
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[...],
#     allow_credentials=True,
#     allow_methods=[...],
#     allow_headers=[...],
# )

# 애플리케이션 시작 시 데이터베이스 초기화
@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 데이터베이스를 초기화합니다."""
    try:
        logger.info("🚀 GRI Service 시작 - 데이터베이스 초기화 중...")
        
        # 데이터베이스 연결 확인
        if await check_database_connection():
            logger.info("✅ 데이터베이스 연결 확인 완료!")
        else:
            logger.error("❌ 데이터베이스 연결 실패!")
            
    except Exception as e:
        logger.error(f"❌ 애플리케이션 시작 시 오류: {e}")

# APIRouter 정의
from app.router.answer_router import router as answer_router
from app.router.polish_router import router as polish_router

# 라우터를 앱에 포함
app.include_router(answer_router)
app.include_router(polish_router)

# 루트 경로 핸들러 (Railway 호환성)
@app.get("/", summary="루트 경로")
async def root():
    """루트 경로 - 서비스 상태 확인"""
    return {
        "message": "GRI Service is running!",
        "service": "GRI Service",
        "version": "1.0.0",
        "status": "healthy",
        "database": "Railway PostgreSQL",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "main": "/v1/gri",
            "health": "/v1/gri/health",
            "categories": "/v1/gri/categories"
        }
    }

# 헬스체크 (루트 레벨)
@app.get("/health", summary="헬스체크")
async def health_check():
    """헬스체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "GRI Service",
        "database": "Railway PostgreSQL",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
    }

if __name__ == "__main__":
    import uvicorn
    import os
    
    # Railway 환경변수 처리 (Railway는 $PORT를 제공)
    port = int(os.getenv("PORT", 8003))
    logger.info(f"🚀 GRI Service 시작 중... 포트: {port}")
    
    # Railway 권장 설정: 0.0.0.0으로 모든 인터페이스에서 리스닝
    uvicorn.run(app, host="0.0.0.0", port=port) 