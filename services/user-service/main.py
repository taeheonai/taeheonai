from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="User Service",
    description="User management microservice",
    version="1.0.0"
)

# 예시 사용자 데이터
users = [
    {"id": 1, "name": "John Doe", "email": "john@example.com", "created_at": "2024-01-01T00:00:00"},
    {"id": 2, "name": "Jane Smith", "email": "jane@example.com", "created_at": "2024-01-02T00:00:00"},
]

class User(BaseModel):
    id: int
    name: str
    email: str
    created_at: str

class CreateUser(BaseModel):
    name: str
    email: str

class UpdateUser(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None

@app.get("/health")
async def health_check():
    """서비스 헬스 체크"""
    return {
        "status": "healthy",
        "service": "user-service",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/users", response_model=List[User])
async def get_users():
    """모든 사용자 조회"""
    logger.info("📋 Fetching all users")
    return users

@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: int):
    """특정 사용자 조회"""
    logger.info(f"👤 Fetching user {user_id}")
    for user in users:
        if user["id"] == user_id:
            return user
    raise HTTPException(status_code=404, detail="User not found")

@app.post("/users", response_model=User)
async def create_user(user: CreateUser):
    """새로운 사용자 생성"""
    logger.info(f"➕ Creating new user: {user.name}")
    new_user = {
        "id": len(users) + 1,
        "name": user.name,
        "email": user.email,
        "created_at": datetime.now().isoformat()
    }
    users.append(new_user)
    return new_user

@app.put("/users/{user_id}", response_model=User)
async def update_user(user_id: int, user: UpdateUser):
    """사용자 정보 업데이트"""
    logger.info(f"✏️ Updating user {user_id}")
    for i, existing_user in enumerate(users):
        if existing_user["id"] == user_id:
            if user.name is not None:
                users[i]["name"] = user.name
            if user.email is not None:
                users[i]["email"] = user.email
            return users[i]
    raise HTTPException(status_code=404, detail="User not found")

@app.delete("/users/{user_id}")
async def delete_user(user_id: int):
    """사용자 삭제"""
    logger.info(f"🗑️ Deleting user {user_id}")
    for i, user in enumerate(users):
        if user["id"] == user_id:
            deleted_user = users.pop(i)
            return {"message": f"User {deleted_user['name']} deleted successfully"}
    raise HTTPException(status_code=404, detail="User not found")

@app.get("/")
async def root():
    """서비스 루트 엔드포인트"""
    return {
        "message": "User Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "users": "/users",
            "user": "/users/{user_id}"
        }
    }

if __name__ == "__main__":
    import uvicorn
    import os
    
    # Railway에서 제공하는 PORT 환경변수 사용
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port) 