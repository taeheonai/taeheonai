"""
Auth 서비스 메인 애플리케이션 진입점
"""
import os
import logging
import sys
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, Request, Depends, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi import APIRouter

# Router import
from app.router.auth_router import auth_router


# 환경 변수 로드
if os.getenv("RAILWAY_ENVIRONMENT") != "true":
    load_dotenv()

# Railway 환경변수 처리
PORT = os.getenv("PORT", "8008")
if not PORT.isdigit():
    PORT = "8008"

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("auth_service")



# # ---------- CORS 설정 (임시 해결책) ----------
# # 모든 도메인 허용 (임시)
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # 임시로 모든 도메인 허용
#     allow_credentials=False,  # credentials와 *를 함께 사용할 수 없음
#     allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
#     allow_headers=["*"],
# )

app = FastAPI()

app.include_router(auth_router)

# 기본 루트 경로
@app.get("/")
async def root():
    return {
        "message": "Auth Service API",
        "version": "0.1.0",
        "status": "running"
    }

# 헬스 체크 엔드포인트
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "auth-service",
        "timestamp": "2025-08-13T08:00:00Z"
    }


# 예외 처리 미들웨어 추가
@app.middleware("http")
async def log_requests(request: Request, call_next):
    client_host = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "unknown")
    logger.info(f"📥 요청: {request.method} {request.url.path} (클라이언트: {client_host})")
    try:
        response = await call_next(request)
        logger.info(f"📤 응답: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"❌ 요청 처리 중 오류: {str(e)}")
        logger.error(traceback.format_exc())
        raise


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=int(PORT), reload=True)
