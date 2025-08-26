from pydantic import BaseModel, Field, field_validator
from typing import Optional

class CorporationResponse(BaseModel):
    id: int
    companyname: str = Field(..., description="기업명")
    corp_code: str = Field(..., description="기업 코드")
    market: Optional[str] = Field(None, description="시장 구분 (KOSPI, KOSDAQ 등)")
    dart_code: Optional[str] = Field(None, description="DART 코드")
    industry: Optional[str] = Field(None, description="산업 분야")

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
