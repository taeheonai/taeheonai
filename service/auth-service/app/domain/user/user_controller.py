from fastapi import HTTPException
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.user.user_schema import SignupIn, LoginIn
from app.domain.user.user_service import UserService

class UserController:
    """
    교차 NTT 역할: 요청을 받아서 적절한 서비스로 전달만 담당
    """
    
    def __init__(self):
        pass

    async def signup(self, request: SignupIn, db: AsyncSession) -> Dict[str, Any]:
        """
        회원가입 요청을 UserService로 전달 (교차 NTT 역할)
        """
        try:
            # 단순 전달: UserService 인스턴스 생성 및 요청 전달
            user_service = UserService(db)
            return await user_service.signup(request)
            
        except Exception as e:
            # 교차 NTT는 단순 전달만, 에러는 상위에서 처리
            raise

    async def login(self, request: LoginIn, db: AsyncSession) -> Dict[str, Any]:
        """
        로그인 요청을 UserService로 전달 (교차 NTT 역할)
        """
        try:
            # 단순 전달: UserService 인스턴스 생성 및 요청 전달
            user_service = UserService(db)
            return await user_service.login(request)
            
        except Exception as e:
            # 교차 NTT는 단순 전달만, 에러는 상위에서 처리
            raise