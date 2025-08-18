from sqlalchemy import (
    Column, String, Integer
)
from app.common.database import Base

class AnswerEntity(Base):
    """GRI 질문에 대한 답변 엔티티"""
    __tablename__ = "gri"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(String(50), nullable=True)  # 회사 ID
    date = Column(String(10), nullable=True)        # 답변 날짜 (YYYY-MM-DD)
    question = Column(String(1000), nullable=True)  # GRI 질문
    answer = Column(String(3000), nullable=True)    # 사용자 답변
    gri_index = Column(String(20), nullable=True)   # GRI 지수/점수