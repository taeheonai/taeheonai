from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date

class AnswerCreate(BaseModel):
    """GRI 답변 생성 스키마"""
    question: str = Field(..., max_length=1000, description="GRI 질문")
    answer: str = Field(..., max_length=3000, description="사용자 답변")
    company_id: Optional[str] = Field(None, max_length=50, description="회사 ID")
    gri_index: Optional[str] = Field(None, max_length=20, description="GRI 지수/점수")

class AnswerResponse(BaseModel):
    """GRI 답변 응답 스키마"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="답변 ID")
    company_id: Optional[str] = Field(None, description="회사 ID")
    date: Optional[str] = Field(None, description="답변 날짜 (YYYY-MM-DD)")
    question: Optional[str] = Field(None, description="GRI 질문")
    answer: Optional[str] = Field(None, description="사용자 답변")
    gri_index: Optional[str] = Field(None, description="GRI 지수/점수")
