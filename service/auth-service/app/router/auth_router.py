from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.common.database import get_db, engine
from app.domain.controller.user_controller import UserController
from app.domain.schema.user_schema import SignupIn, LoginIn
from pydantic import ValidationError
from datetime import datetime, timezone
import logging

# ---- (권장) 안전한 비밀번호 해시: bcrypt ----
# pip install passlib[bcrypt]
from passlib.context import CryptContext
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 로거 설정 - auth_router 전용
logger = logging.getLogger("auth_router")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

auth_router = APIRouter(prefix="/v1/auth", tags=["auth"])

# UserController 인스턴스 생성
user_controller = UserController()

# ========= 패스워드 유틸 =========
def hash_password(password: str) -> str:
    # (권장) bcrypt
    return pwd_ctx.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_ctx.verify(plain_password, hashed_password)

# # (대안) 외부 의존 없이 hashlib + salt (보안성 낮음, 권장 X)
# import os, hashlib, base64
# def hash_password(password: str) -> str:
#     salt = os.urandom(16)
#     digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
#     return base64.b64encode(salt + digest).decode()
# def verify_password(plain_password: str, stored: str) -> bool:
#     blob = base64.b64decode(stored.encode())
#     salt, digest = blob[:16], blob[16:]
#     test = hashlib.pbkdf2_hmac("sha256", plain_password.encode(), salt, 200_000)
#     return test == digest

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# ========= 라우트 =========

@auth_router.post("/signup", summary="회원가입")
async def signup(payload: SignupIn, db: AsyncSession = Depends(get_db)):
    logger.info("🚀 === 회원가입 요청 시작 ===")
    logger.info(f"📅 요청 시간(UTC): {utc_now_iso()}")
    logger.info(f"📝 받은 BaseModel 데이터: {payload}")
    
    try:
        # UserController를 통한 회원가입 처리
        logger.info("🔧 UserController를 통한 회원가입 처리 시작")
        result = await user_controller.signup(payload, db)
        
        logger.info("🎉 === 회원가입 성공 ===")
        return result

    except HTTPException:
        logger.error("❌ HTTP 오류 - 회원가입 실패")
        raise
    except Exception as e:
        logger.error(f"❌ 예외: {e} ({type(e).__name__})")
        raise HTTPException(status_code=500, detail="회원가입 처리 중 오류가 발생했습니다.")

@auth_router.post("/login", summary="로그인")
async def login(payload: LoginIn, db: AsyncSession = Depends(get_db)):
    logger.info("🚀 === 로그인 요청 시작 ===")
    logger.info(f"📅 요청 시간(UTC): {utc_now_iso()}")
    masked_pw = "*" * len(payload.auth_pw)
    logger.info(f"📝 받은 BaseModel 데이터: auth_id={payload.auth_id}, auth_pw={masked_pw}")

    try:
        # UserController를 통한 로그인 처리
        logger.info("🔧 UserController를 통한 로그인 처리 시작")
        result = await user_controller.login(payload, db)
        
        logger.info(f"🎉 로그인 성공! 사용자: {payload.auth_id}")
        return result

    except HTTPException:
        logger.error("❌ HTTP 오류 - 로그인 실패")
        raise
    except Exception as e:
        logger.error(f"❌ 예외: {e} ({type(e).__name__})")
        raise HTTPException(status_code=500, detail="로그인 처리 중 오류가 발생했습니다.")

@auth_router.get("/health", summary="헬스체크")
async def health_check():
    logger.info("🏥 헬스체크 요청")
    db_status = "connected" if engine else "disconnected"
    logger.info(f"🏥 헬스 결과: DB={db_status}")
    return {
        "status": "healthy",
        "service": "auth-service",
        "database": db_status,
        "timestamp": utc_now_iso(),
        "version": "1.0.0",
    }