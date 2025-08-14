from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db, engine
from app.models import User
from datetime import datetime, timezone
import logging
from typing import Optional

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

# ========= Pydantic 입력 스키마 =========
class SignupIn(BaseModel):
    # id는 보통 DB에서 자동발급. 필요시 Optional로 허용
    id: Optional[int] = Field(default=None)
    company_id: Optional[str] = None
    industry: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    age: Optional[str] = None  # int에서 str로 변경
    auth_id: str = Field(..., min_length=3, max_length=64)
    auth_pw: str = Field(..., min_length=4, max_length=128)

class LoginIn(BaseModel):
    auth_id: str = Field(..., min_length=3, max_length=64)
    auth_pw: str = Field(..., min_length=4, max_length=128)

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
    # 민감정보 마스킹
    masked_pw = "*" * len(payload.auth_pw)
    logger.info(
        "📝 회원가입 데이터: "
        f"id={payload.id}, company_id={payload.company_id}, industry={payload.industry}, "
        f"email={payload.email}, name={payload.name}, age={payload.age}, "
        f"auth_id={payload.auth_id}, auth_pw={masked_pw}"
    )

    try:
        # 사용자 중복 체크
        logger.info("🔍 기존 사용자 확인 중...")
        result = await db.execute(select(User).where(User.auth_id == payload.auth_id))
        existing_user = result.scalar_one_or_none()
        if existing_user:
            logger.warning(f"❌ 이미 존재하는 사용자: {payload.auth_id}")
            raise HTTPException(status_code=400, detail="이미 존재하는 사용자입니다.")

        logger.info("✅ 기존 사용자 없음 - 새 사용자 생성")
        hashed_pw = hash_password(payload.auth_pw)
        logger.info("🔐 비밀번호 해시 완료")

        # PK(id)는 보통 DB가 생성 → payload.id가 None이면 DB에 맡김
        new_user = User(
            id=payload.id,
            company_id=payload.company_id,
            industry=payload.industry,
            email=payload.email,
            name=payload.name,
            age=payload.age,
            auth_id=payload.auth_id,
            auth_pw=hashed_pw,
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        logger.info(f"✅ 사용자 저장 완료! ID: {new_user.id}, Auth ID: {new_user.auth_id}")
        logger.info("🎉 === 회원가입 성공 ===")

        return {
            "success": True,
            "message": "회원가입이 완료되었습니다.",
            "user_id": str(new_user.id),
            "timestamp": utc_now_iso(),
        }

    except HTTPException:
        logger.error("❌ HTTP 오류 - 회원가입 실패")
        raise
    except Exception as e:
        logger.error(f"❌ 예외: {e} ({type(e).__name__})")
        try:
            await db.rollback()
            logger.info("🔄 롤백 완료")
        except Exception as re:
            logger.warning(f"롤백 실패: {re}")
        raise HTTPException(status_code=500, detail="회원가입 처리 중 오류가 발생했습니다.")

@auth_router.post("/login", summary="로그인")
async def login(payload: LoginIn, db: AsyncSession = Depends(get_db)):
    logger.info("🚀 === 로그인 요청 시작 ===")
    logger.info(f"📅 요청 시간(UTC): {utc_now_iso()}")
    masked_pw = "*" * len(payload.auth_pw)
    logger.info(f"📝 로그인 데이터: auth_id={payload.auth_id}, auth_pw={masked_pw}")

    try:
        result = await db.execute(select(User).where(User.auth_id == payload.auth_id))
        user = result.scalar_one_or_none()
        if not user:
            logger.warning(f"❌ 사용자를 찾을 수 없음: {payload.auth_id}")
            raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

        if not verify_password(payload.auth_pw, user.auth_pw):
            logger.warning(f"❌ 비밀번호 불일치: {payload.auth_id}")
            raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

        logger.info(f"🎉 로그인 성공! 사용자: {payload.auth_id}")
        return {
            "success": True,
            "message": "로그인이 완료되었습니다.",
            "user_id": str(user.id),
            "timestamp": utc_now_iso(),
        }

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