from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class AnswerItem(BaseModel):
    """윤문 요청에 포함된 개별 답변 항목"""
    question_id: int
    key_alpha: str
    text: str


class PolishRequest(BaseModel):
    """GRI 답변 윤문 요청"""
    session_key: str
    gri_index: str
    item_title: str
    answers: List[AnswerItem]
    style: Optional[str] = "중립"
    audience: Optional[str] = "실무자"
    extra_instructions: Optional[str] = None


class PolishSource(BaseModel):
    """윤문 소스 정보"""
    requirement: str
    hash: str


class PolishBase(BaseModel):
    """윤문 기본 모델"""
    id: Optional[int] = None
    session_key: str
    gri_index: str
    polished_text: str
    sources: List[Dict[str, str]]  # [{requirement: str, hash: str}]
    model: str
    input_tokens: int
    output_tokens: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class PolishCreate(PolishBase):
    """윤문 생성 모델"""
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)


class PolishUpdate(BaseModel):
    """윤문 업데이트 모델"""
    polished_text: Optional[str] = None
    sources: Optional[List[Dict[str, str]]] = None
    model: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None


class PolishResponse(PolishBase):
    """윤문 응답 모델"""
    pass


class PolishResult(BaseModel):
    """윤문 결과 래퍼"""
    status: str = "success"
    data: PolishResponse
