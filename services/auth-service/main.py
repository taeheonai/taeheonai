from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import jwt
import hashlib
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Auth Service",
    description="Authentication microservice",
    version="1.0.0"
)

# JWT 설정
SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# 보안 설정
security = HTTPBearer()

# 예시 사용자 데이터베이스
users_db = {
    "john@example.com": {
        "id": 1,
        "email": "john@example.com",
        "hashed_password": hashlib.sha256("password123".encode()).hexdigest(),
        "full_name": "John Doe"
    },
    "jane@example.com": {
        "id": 2,
        "email": "jane@example.com",
        "hashed_password": hashlib.sha256("password456".encode()).hexdigest(),
        "full_name": "Jane Smith"
    }
}

# Pydantic 모델
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserInfo(BaseModel):
    id: int
    email: str
    full_name: str

# JWT 토큰 생성
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# 토큰 검증
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/health")
async def health_check():
    """서비스 헬스 체크"""
    return {
        "status": "healthy",
        "service": "auth-service",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/login", response_model=Token)
async def login(user_credentials: UserLogin):
    """사용자 로그인"""
    logger.info(f"🔐 Login attempt for {user_credentials.email}")
    
    user = users_db.get(user_credentials.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    hashed_password = hashlib.sha256(user_credentials.password.encode()).hexdigest()
    if hashed_password != user["hashed_password"]:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    logger.info(f"✅ Login successful for {user_credentials.email}")
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/register", response_model=UserInfo)
async def register(user_data: UserRegister):
    """새로운 사용자 등록"""
    logger.info(f"📝 Registration attempt for {user_data.email}")
    
    if user_data.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hashlib.sha256(user_data.password.encode()).hexdigest()
    new_user = {
        "id": len(users_db) + 1,
        "email": user_data.email,
        "hashed_password": hashed_password,
        "full_name": user_data.full_name
    }
    
    users_db[user_data.email] = new_user
    
    logger.info(f"✅ Registration successful for {user_data.email}")
    return UserInfo(
        id=new_user["id"],
        email=new_user["email"],
        full_name=new_user["full_name"]
    )

@app.get("/me", response_model=UserInfo)
async def get_current_user(email: str = Depends(verify_token)):
    """현재 사용자 정보 조회"""
    logger.info(f"👤 Fetching user info for {email}")
    
    user = users_db.get(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserInfo(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"]
    )

@app.post("/verify")
async def verify_token_endpoint(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """토큰 검증 엔드포인트"""
    try:
        email = verify_token(credentials)
        return {"valid": True, "email": email}
    except HTTPException:
        return {"valid": False}

@app.get("/")
async def root():
    """서비스 루트 엔드포인트"""
    return {
        "message": "Auth Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "login": "/login",
            "register": "/register",
            "me": "/me",
            "verify": "/verify"
        }
    }

if __name__ == "__main__":
    import uvicorn
    import os
    
    # Railway에서 제공하는 PORT 환경변수 사용
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port) 