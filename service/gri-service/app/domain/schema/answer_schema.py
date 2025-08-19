from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import date

class AnswerCreate(BaseModel):
    """GRI 답변 생성 스키마"""
    question_id: int = Field(..., description="질문 ID")
    session_key: str = Field(..., max_length=100, description="세션 키")
    answer_text: str = Field(..., max_length=3000, description="사용자 답변")
    answer_json: Optional[Dict[str, Any]] = Field(None, description="추가 JSON 데이터")

class AnswerResponse(BaseModel):
    """GRI 답변 응답 스키마"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="답변 ID")
    question_id: int = Field(..., description="질문 ID")
    session_key: str = Field(..., description="세션 키")
    answer_text: str = Field(..., description="사용자 답변")
    answer_json: Optional[Dict[str, Any]] = Field(None, description="추가 JSON 데이터")
    is_completed: bool = Field(..., description="답변 완료 여부")
    created_at: str = Field(..., description="생성 시간")
    updated_at: str = Field(..., description="수정 시간")
