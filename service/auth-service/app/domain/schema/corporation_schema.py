from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CorporationBase(BaseModel):
    companyname: str = Field(..., min_length=1, max_length=255, description="기업명")
    industry: Optional[str] = Field(None, max_length=100, description="산업 분야")

class CorporationCreate(CorporationBase):
    pass

class CorporationResponse(CorporationBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CorporationSearch(BaseModel):
    q: str = Field(..., min_length=1, description="검색어")
