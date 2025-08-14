from pydantic import BaseModel, Field
from typing import Optional

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