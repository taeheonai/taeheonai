from fastapi import HTTPException
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.user.user_schema import SignupIn, LoginIn
from app.domain.user.user_repository import UserRepository
from datetime import datetime, timezone

class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repository = UserRepository(db)

    async def signup(self, signup_data: SignupIn) -> Dict[str, Any]:
        """
        사용자 회원가입을 처리합니다.
        """
        try:
            # 사용자 중복 체크
            if await self.user_repository.check_user_exists(signup_data.auth_id):
                raise HTTPException(
                    status_code=400, 
                    detail="이미 존재하는 사용자입니다."
                )

            # UserRepository를 통한 사용자 생성 (BaseModel → Entity 변환)
            user_entity = await self.user_repository.create_user(signup_data)

            return {
                "success": True,
                "message": "회원가입이 완료되었습니다.",
                "user_id": str(user_entity.id),
                "auth_id": user_entity.auth_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"회원가입 처리 중 오류가 발생했습니다: {str(e)}"
            )

    async def login(self, login_data: LoginIn) -> Dict[str, Any]:
        """
        사용자 로그인을 처리합니다.
        """
        try:
            # UserRepository를 통한 사용자 인증
            user_entity = await self.user_repository.authenticate_user(login_data)
            
            if not user_entity:
                raise HTTPException(
                    status_code=401, 
                    detail="아이디 또는 비밀번호가 올바르지 않습니다."
                )

            return {
                "success": True,
                "message": "로그인이 완료되었습니다.",
                "user_id": str(user_entity.id),
                "auth_id": user_entity.auth_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"로그인 처리 중 오류가 발생했습니다: {str(e)}"
            )
