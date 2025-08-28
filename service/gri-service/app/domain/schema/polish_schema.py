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


class PolishResult(BaseModel):
    """윤문 결과 모델 (LLM 서비스와 동일한 구조)"""
    polished_text: Dict[str, Any]  # JSONB 데이터
    sources: List[Dict[str, Any]]  # [{"requirement": "a", "hash": "..."}]
    model: str
    created_at_utc: str  # ISO 형식의 UTC 시간
    # GRI 서비스 추가 필드
    session_key: str
    gri_index: str
