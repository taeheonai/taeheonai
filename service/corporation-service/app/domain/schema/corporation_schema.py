from pydantic import BaseModel, Field, field_validator
from typing import Optional

class CorporationBase(BaseModel):
    """기업 정보 기본 스키마"""
    companyname: str = Field(..., description="기업명")
    corp_code: str = Field(..., description="기업 코드")
    market: Optional[str] = Field(None, description="시장 구분 (KOSPI, KOSDAQ 등)")
    dart_code: Optional[str] = Field(None, description="DART 코드")

class CorporationCreate(CorporationBase):
    """기업 정보 생성 스키마"""
    pass

class CorporationUpdate(BaseModel):
    """기업 정보 수정 스키마"""
    companyname: Optional[str] = Field(None, description="기업명")
    corp_code: Optional[str] = Field(None, description="기업 코드")
    market: Optional[str] = Field(None, description="시장 구분")
    dart_code: Optional[str] = Field(None, description="DART 코드")

class CorporationResponse(CorporationBase):
    """기업 정보 응답 스키마"""
    id: int

    class Config:
        from_attributes = True

    @field_validator("dart_code", mode="before")
    @classmethod
    def cast_dart_code_to_str(cls, v):
        if v is None:
            return v
        # int를 str로 안전하게 변환 (선행 0 보존)
        return str(v)

    @field_validator("corp_code", mode="before")
    @classmethod
    def cast_corp_code_to_str(cls, v):
        if v is None:
            return v
        # int를 str로 안전하게 변환 (선행 0 보존)
        return str(v)

class CorporationListResponse(BaseModel):
    """기업 목록 응답 스키마"""
    success: bool
    message: str
    data: list[CorporationResponse]
    count: int
    total: Optional[int] = None
