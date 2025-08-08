from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('auth-service')

app = FastAPI(
    title="Auth Service",
    description="Authentication Service for TaeheonAI",
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

# 요청 모델
class SignupRequest(BaseModel):
    id: str
    company_id: str = None
    industry: str = None
    email: str
    name: str
    age: str = None
    auth_id: str
    auth_pw: str

class LoginRequest(BaseModel):
    auth_id: str
    auth_pw: str

class AuthResponse(BaseModel):
    success: bool
    message: str
    user_id: str = None
    timestamp: datetime

@app.get("/health")
async def health_check():
    """헬스체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "auth-service",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "Auth Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "signup": "/signup",
            "login": "/login"
        }
    }

@app.post("/signup")
async def signup(request: SignupRequest):
    """회원가입 처리"""
    try:
        logger.info(f"Signup request for user: {request.auth_id}")
        
        # 실제로는 데이터베이스에 저장
        # 여기서는 로그만 출력
        logger.info(f"User data: {request.dict()}")
        
        return AuthResponse(
            success=True,
            message="회원가입이 완료되었습니다.",
            user_id=request.id,
            timestamp=datetime.now()
        )
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="Signup processing error")

@app.post("/login")
async def login(request: LoginRequest):
    """로그인 처리"""
    try:
        logger.info(f"Login request for user: {request.auth_id}")
        
        # 실제로는 데이터베이스에서 인증 확인
        # 여기서는 로그만 출력
        logger.info(f"Login attempt: {request.dict()}")
        
        return AuthResponse(
            success=True,
            message="로그인이 완료되었습니다.",
            user_id=request.auth_id,
            timestamp=datetime.now()
        )
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login processing error")

@app.get("/user/{user_id}")
async def get_user_info(user_id: str):
    """사용자 정보 조회"""
    try:
        # 실제로는 데이터베이스에서 조회
        return {
            "user_id": user_id,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"User info error: {e}")
        raise HTTPException(status_code=500, detail="User info retrieval error")

if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port) 