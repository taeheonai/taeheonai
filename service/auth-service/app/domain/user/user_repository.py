from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.domain.user.user_entity import UserEntity

from app.domain.user.user_schema import SignupIn, LoginIn
from typing import Optional, Dict, Any
from fastapi import HTTPException
from passlib.context import CryptContext
from datetime import datetime, timezone

# 비밀번호 해시를 위한 CryptContext
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    def hash_password(self, password: str) -> str:
        """비밀번호를 해시화합니다."""
        return pwd_ctx.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """비밀번호를 검증합니다."""
        return pwd_ctx.verify(plain_password, hashed_password)

    def _convert_signup_to_entity(self, signup_data: SignupIn) -> UserEntity:
        """
        SignupIn BaseModel을 UserEntity로 변환합니다.
        """
        # 비밀번호 해시화
        hashed_password = self.hash_password(signup_data.auth_pw)
        
        # UserEntity 생성
        user_entity = UserEntity(
            company_id=signup_data.company_id,
            industry=signup_data.industry,
            email=signup_data.email,
            name=signup_data.name,
            age=signup_data.age,
            auth_id=signup_data.auth_id,
            auth_pw=hashed_password,
        )
        
        return user_entity

    async def create_user(self, signup_data: SignupIn) -> UserEntity:
        """
        새로운 사용자를 생성하고 데이터베이스에 저장합니다.
        """
        try:
            # BaseModel을 Entity로 변환
            user_entity = self._convert_signup_to_entity(signup_data)
            
            # 데이터베이스에 저장
            self.db.add(user_entity)
            await self.db.commit()
            await self.db.refresh(user_entity)
            
            return user_entity
            
        except Exception as e:
            await self.db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"사용자 생성 중 오류가 발생했습니다: {str(e)}"
            )

    async def find_user_by_auth_id(self, auth_id: str) -> Optional[UserEntity]:
        """
        auth_id로 사용자를 조회합니다.
        """
        try:
            result = await self.db.execute(
                select(UserEntity).where(UserEntity.auth_id == auth_id)
            )
            return result.scalar_one_or_none()
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"사용자 조회 중 오류가 발생했습니다: {str(e)}"
            )

    async def check_user_exists(self, auth_id: str) -> bool:
        """
        사용자가 존재하는지 확인합니다.
        """
        user = await self.find_user_by_auth_id(auth_id)
        return user is not None

    async def authenticate_user(self, login_data: LoginIn) -> Optional[UserEntity]:
        """
        사용자 인증을 처리합니다.
        """
        try:
            # 사용자 조회
            user = await self.find_user_by_auth_id(login_data.auth_id)
            
            if not user:
                return None
            
            # 비밀번호 검증
            if not self.verify_password(login_data.auth_pw, user.auth_pw):
                return None
            
            return user
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"사용자 인증 중 오류가 발생했습니다: {str(e)}"
            )

    def _convert_entity_to_response(self, user_entity: UserEntity) -> Dict[str, Any]:
        """
        UserEntity를 응답용 딕셔너리로 변환합니다.
        """
        return {
            "id": str(user_entity.id),
            "company_id": user_entity.company_id,
            "industry": user_entity.industry,
            "email": user_entity.email,
            "name": user_entity.name,
            "age": user_entity.age,
            "auth_id": user_entity.auth_id,
            "created_at": user_entity.created_at.isoformat() if user_entity.created_at else None,
            "updated_at": user_entity.updated_at.isoformat() if user_entity.updated_at else None,
        }
