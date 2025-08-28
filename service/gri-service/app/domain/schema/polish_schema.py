from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel


class AnswerItem(BaseModel):
    """윤문 요청에 포함된 개별 답변 항목"""
    question_id: int
    key_alpha: str
    text: str


class PolishRequest(BaseModel):
    """GRI 답변 윤문 요청"""
    session_key: str
    gri_index: str
    answers: List[AnswerItem]
    extra_instructions: Optional[str] = None


class PolishCreate(BaseModel):
    """윤문 결과 생성 모델"""
    session_key: str
    gri_index: str
    polished_text: Dict[str, Any]  # JSONB 데이터
    model: str


class PolishUpdate(BaseModel):
    """윤문 결과 업데이트 모델"""
    polished_text: Optional[Dict[str, Any]] = None  # JSONB 데이터
    model: Optional[str] = None


class PolishResponse(BaseModel):
    """윤문 결과 응답 모델"""
    id: int
    session_key: str
    gri_index: str
    polished_text: Dict[str, Any]  # JSONB 데이터
    model: str
    created_at: datetime
    updated_at: datetime
