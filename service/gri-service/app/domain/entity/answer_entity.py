from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Index
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.mutable import MutableDict
from app.common.database import Base

class AnswerEntity(Base):
    __tablename__ = "gri_answer"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, nullable=False, index=True)
    session_key = Column(String(100), nullable=False, index=True)
    answer_text = Column(Text, nullable=False)
    # JSONB + MutableDict
    answer_json = Column(MutableDict.as_mutable(JSONB), nullable=True)
    is_completed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

Index("ix_gri_answer_session_question", AnswerEntity.session_key, AnswerEntity.question_id)
