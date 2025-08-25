from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Text, JSONB
)
from sqlalchemy.sql import func
from app.common.database.database import Base

class AnswerEntity(Base):
    """GRI 질문에 대한 답변 엔티티"""
    __tablename__ = "gri_answer"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, nullable=False, index=True)  # 질문 ID (gri_question 테이블 참조)
    session_key = Column(String(100), nullable=False, index=True)  # 세션 키
    answer_text = Column(Text, nullable=False)  # 사용자 답변
    answer_json = Column(JSONB, nullable=True)  # 추가 JSON 데이터
    is_completed = Column(Boolean, default=False)  # 답변 완료 여부
    created_at = Column(DateTime(timezone=True), server_default=func.now())  # 생성 시간
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())  # 수정 시간