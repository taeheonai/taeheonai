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

if os.getenv("RAILWAY_ENVIRONMENT") != "true":
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

# APIRouter 정의
auth_router = APIRouter()

# 요청 모델
class SignupRequest(BaseModel):
    id: str = None
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

# 비밀번호 해싱 함수
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# 비밀번호 검증 함수
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

@auth_router.get("/health")
async def health_check():
    """헬스체크 엔드포인트"""
    db_status = "connected" if engine else "disconnected"
    return {
        "status": "healthy",
        "service": "auth-service",
        "database": db_status,
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@auth_router.get("/db-status")
async def database_status():
    """데이터베이스 연결 상태 확인"""
    try:
        if engine:
            # 간단한 연결 테스트
            with engine.connect() as conn:
                conn.execute("SELECT 1")
            return {"status": "connected", "message": "Database is available"}
        else:
            return {"status": "disconnected", "message": "Database engine not available"}
    except Exception as e:
        return {"status": "error", "message": f"Database connection failed: {str(e)}"}

@auth_router.get("/")
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

@auth_router.post("/signup")
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """회원가입 처리"""
    try:
        logger.info(f"Signup request for user: {request.auth_id}")
        logger.info(f"Database session: {db}")
        
        # 데이터베이스 연결 확인
        if not db:
            # 데이터베이스 없이도 동작 (로컬 개발용)
            logger.info("Database not available, proceeding without database")
            return AuthResponse(
                success=True,
                message="회원가입이 완료되었습니다. (데이터베이스 저장 안됨)",
                user_id=request.id or "temp_id",
                timestamp=datetime.now()
            )
        
        # 기존 사용자 확인
        existing_user = db.query(User).filter(User.auth_id == request.auth_id).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="이미 존재하는 사용자입니다.")
        
        # 비밀번호 해싱
        hashed_password = hash_password(request.auth_pw)
        
        # 새 사용자 생성
        new_user = User(
            id=int(request.id) if request.id and request.id.isdigit() else None,
            company_id=request.company_id,
            industry=request.industry,
            email=request.email,
            name=request.name,
            age=request.age,
            auth_id=request.auth_id,
            auth_pw=hashed_password
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"User created successfully: {request.auth_id}")
        
        return AuthResponse(
            success=True,
            message="회원가입이 완료되었습니다.",
            user_id=request.id,
            timestamp=datetime.now()
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {e}")
        if db:
            db.rollback()
        raise HTTPException(status_code=500, detail="회원가입 처리 중 오류가 발생했습니다.")

@auth_router.post("/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """로그인 처리"""
    try:
        logger.info(f"Login request for user: {request.auth_id}")
        
        # 데이터베이스 연결 확인
        if not db:
            # 데이터베이스 없이도 동작 (로컬 개발용)
            logger.info("Database not available, proceeding without database")
            return AuthResponse(
                success=True,
                message="로그인이 완료되었습니다. (데이터베이스 확인 안됨)",
                user_id="temp_user",
                timestamp=datetime.now()
            )
        
        # 사용자 조회
        user = db.query(User).filter(User.auth_id == request.auth_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
        
        # 비밀번호 검증
        if not verify_password(request.auth_pw, user.auth_pw):
            raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
        
        logger.info(f"Login successful: {request.auth_id}")
        
        return AuthResponse(
            success=True,
            message="로그인이 완료되었습니다.",
            user_id=str(user.id),
            timestamp=datetime.now()
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="로그인 처리 중 오류가 발생했습니다.")

@auth_router.get("/user/{user_id}")
async def get_user_info(user_id: str, db: Session = Depends(get_db)):
    """사용자 정보 조회"""
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
        
        return {
            "user_id": str(user.id),
            "company_id": user.company_id,
            "industry": user.industry,
            "email": user.email,
            "name": user.name,
            "age": user.age,
            "auth_id": user.auth_id,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "timestamp": datetime.now().isoformat()
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="잘못된 사용자 ID입니다.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User info error: {e}")
        raise HTTPException(status_code=500, detail="사용자 정보 조회 중 오류가 발생했습니다.")

# 라우터를 앱에 포함
app.include_router(auth_router)

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