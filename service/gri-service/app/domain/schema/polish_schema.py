from typing import List, Optional, Dict, Any, Union, Mapping
from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID, uuid4


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


# 저장/캐시 엔티티 (Repo가 반환)
class PolishEntity(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    session_key: str
    gri_index: str
    polished_text: Dict[str, Any]
    model: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    model_config = ConfigDict(from_attributes=True)


class PolishResponse(BaseModel):
    """윤문 결과 응답 모델"""
    id: UUID
    session_key: str
    gri_index: str
    polished_text: Dict[str, Any]  # JSONB 데이터
    model: str
    created_at: datetime
    updated_at: datetime

    # ✅ 중앙 매퍼(팩토리): 어디서든 이걸로 변환
    @classmethod
    def from_entity(cls, rec: "PolishEntity | Mapping[str, Any]") -> "PolishResponse":
        return cls.model_validate(rec)