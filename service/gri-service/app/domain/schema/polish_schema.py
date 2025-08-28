from typing import List, Optional, Dict, Any
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
    item_title: str
    answers: List[AnswerItem]
    style: Optional[str] = "중립"
    audience: Optional[str] = "실무자"
    extra_instructions: Optional[str] = None


class PolishResult(BaseModel):
    """윤문 결과 모델 (LLM 서비스와 동일한 구조)"""
    polished_text: str
    sources: List[Dict[str, Any]]  # [{"requirement": "a", "hash": "..."}]
    model: str
    prompt_hash: str
    created_at: str  # ISO 형식의 UTC 시간

    # GRI 서비스 추가 필드
    session_key: str
    gri_index: str
