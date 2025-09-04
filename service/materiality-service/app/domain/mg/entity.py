"""
MG (Materiality GRI) Entity Definitions
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class MGIndex(Base):
    """MG 인덱스 엔티티"""
    __tablename__ = "mg_indexes"
    
    id = Column(Integer, primary_key=True, index=True)
    gri_index = Column(String(50), nullable=False, index=True)
    item_id = Column(Integer, nullable=False)
    item_title = Column(String(255), nullable=True)
    frequency = Column(Integer, nullable=True)
    grade = Column(String(1), nullable=True)  # A, B, C
    category_id = Column(Integer, nullable=False)
    corporation_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MGQuestion(Base):
    """MG 질문 엔티티"""
    __tablename__ = "mg_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    key_alpha = Column(String(10), nullable=True)
    text = Column(Text, nullable=False)
    order = Column(Integer, nullable=False, default=0)
    gri_index = Column(String(50), nullable=False, index=True)
    item_id = Column(Integer, nullable=False)
    category_id = Column(Integer, nullable=False)
    required = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MGPolishResult(Base):
    """MG 윤문 결과 엔티티"""
    __tablename__ = "mg_polish_results"
    
    id = Column(Integer, primary_key=True, index=True)
    session_key = Column(String(255), nullable=False, index=True)
    gri_index = Column(String(50), nullable=False)
    item_id = Column(Integer, nullable=False)
    item_title = Column(String(255), nullable=True)
    polished_text = Column(Text, nullable=True)
    category_id = Column(Integer, nullable=False)
    corporation_id = Column(Integer, nullable=True)
    thread_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
