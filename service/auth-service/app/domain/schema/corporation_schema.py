from pydantic import BaseModel, Field
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
