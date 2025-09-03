"""
Search Schema - Pydantic BaseModel
"""
from pydantic import BaseModel
from typing import Optional

class CompanySearchRequest(BaseModel):
    """기업 검색 요청 스키마 - 기업명만 사용"""
    companyname: str
