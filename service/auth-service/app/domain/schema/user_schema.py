from pydantic import BaseModel, Field
from typing import Optional

# ========= Pydantic 입력 스키마 =========
class SignupIn(BaseModel):
    # id는 보통 DB에서 자동발급. 필요시 Optional로 허용
    id: Optional[int] = Field(default=None)
    company_name: str = Field(..., min_length=1, max_length=255, description="기업명")  # 사용자가 입력하는 기업명
    corporation_id: Optional[int] = None  # Corporation 테이블의 ID (자동 매핑)
    industry: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    birth: Optional[str] = None  # birth 필드명 유지
    auth_id: str = Field(..., min_length=3, max_length=64)
    auth_pw: str = Field(..., min_length=4, max_length=128)

class LoginIn(BaseModel):
    auth_id: str = Field(..., min_length=3, max_length=64)
    auth_pw: str = Field(..., min_length=4, max_length=128)