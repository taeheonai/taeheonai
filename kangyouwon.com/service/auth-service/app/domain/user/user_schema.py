"""
User Schema - 모든 사용자 관련 Pydantic 모델 정의
"""
from pydantic import BaseModel, Field
from typing import Optional

class LoginRequest(BaseModel):
    """로그인 요청 모델"""
    auth_id: str = Field(..., description="사용자 인증 ID", min_length=1)
    auth_pw: str = Field(..., description="사용자 비밀번호", min_length=1)

class SignupRequest(BaseModel):
    """회원가입 요청 모델"""
    id: Optional[int] = Field(None, description="사용자 ID")
    company_id: str = Field(..., description="회사 ID", min_length=1)
    industry: str = Field(..., description="산업 분야", min_length=1)
    email: str = Field(..., description="이메일 주소", pattern=r"^[^@]+@[^@]+\.[^@]+$")
    name: str = Field(..., description="사용자 이름", min_length=1)
    birth: str = Field(..., description="생년월일", min_length=1)
    auth_id: str = Field(..., description="인증 ID", min_length=1)
    auth_pw: str = Field(..., description="인증 비밀번호", min_length=1)
