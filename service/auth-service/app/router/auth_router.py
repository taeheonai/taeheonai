from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from datetime import datetime
import hashlib

auth_router = APIRouter(prefix="/v1/auth", tags=["auth"])

# 비밀번호 해싱 함수
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# 비밀번호 검증 함수
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

@auth_router.post("/signup", summary="회원가입")
async def signup(request: dict, db: Session = Depends(get_db)):
    """
    사용자 회원가입을 처리합니다.
    """
    try:
        # 프론트엔드에서 보낸 데이터를 Docker 로그에 출력
        print("=== 회원가입 Alert 데이터 (Backend) ===")
        print(f"회원가입 데이터 (JSON):")
        print(f"ID: {request.get('id')}")
        print(f"Company ID: {request.get('company_id')}")
        print(f"Industry: {request.get('industry')}")
        print(f"Email: {request.get('email')}")
        print(f"Name: {request.get('name')}")
        print(f"Age: {request.get('age')}")
        print(f"Auth ID: {request.get('auth_id')}")
        print(f"Auth PW: {request.get('auth_pw')}")
        print("=== Alert 데이터 끝 (Backend) ===")
        
        # 데이터베이스 연결 확인
        if not db:
            print("Database not available, proceeding without database")
            return {
                "success": True,
                "message": "회원가입이 완료되었습니다. (데이터베이스 저장 안됨)",
                "user_id": request.get('id') or "temp_id",
                "timestamp": datetime.now()
            }
        
        # 기존 사용자 확인
        existing_user = db.query(User).filter(User.auth_id == request.get('auth_id')).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="이미 존재하는 사용자입니다.")
        
        # 비밀번호 해싱
        hashed_password = hash_password(request.get('auth_pw'))
        
        # 새 사용자 생성
        new_user = User(
            id=int(request.get('id')) if request.get('id') and request.get('id').isdigit() else None,
            company_id=request.get('company_id'),
            industry=request.get('industry'),
            email=request.get('email'),
            name=request.get('name'),
            age=request.get('age'),
            auth_id=request.get('auth_id'),
            auth_pw=hashed_password
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print(f"User created successfully: {request.get('auth_id')}")
        
        return {
            "success": True,
            "message": "회원가입이 완료되었습니다.",
            "user_id": request.get('id'),
            "timestamp": datetime.now()
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signup error: {e}")
        if db:
            db.rollback()
        raise HTTPException(status_code=500, detail="회원가입 처리 중 오류가 발생했습니다.")

@auth_router.post("/login", summary="로그인")
async def login(request: dict, db: Session = Depends(get_db)):
    """
    사용자 로그인을 처리합니다.
    """
    try:
        # 프론트엔드에서 보낸 데이터를 Docker 로그에 출력
        print("=== 로그인 Alert 데이터 (Backend) ===")
        print(f"로그인 데이터 (JSON):")
        print(f"Auth ID: {request.get('auth_id')}")
        print(f"Auth PW: {request.get('auth_pw')}")
        print("=== Alert 데이터 끝 (Backend) ===")
        
        auth_id = request.get('auth_id')
        auth_pw = request.get('auth_pw')
        
        if not auth_id or not auth_pw:
            raise HTTPException(status_code=400, detail="아이디와 비밀번호를 입력해주세요.")
        
        # 데이터베이스 연결 확인
        if not db:
            print("Database not available, proceeding without database")
            return {
                "success": True,
                "message": "로그인이 완료되었습니다. (데이터베이스 확인 안됨)",
                "user_id": "temp_user",
                "timestamp": datetime.now()
            }
        
        # 사용자 조회
        user = db.query(User).filter(User.auth_id == auth_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
        
        # 비밀번호 검증
        if not verify_password(auth_pw, user.auth_pw):
            raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
        
        print(f"Login successful: {auth_id}")
        
        return {
            "success": True,
            "message": "로그인이 완료되었습니다.",
            "user_id": str(user.id),
            "timestamp": datetime.now()
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="로그인 처리 중 오류가 발생했습니다.")

@auth_router.get("/health", summary="헬스체크")
async def health_check():
    """
    서비스 헬스체크
    """
    from ..database import engine
    db_status = "connected" if engine else "disconnected"
    return {
        "status": "healthy",
        "service": "auth-service",
        "database": db_status,
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }