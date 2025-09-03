from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class SurveyEntity(Base):
    """설문 엔티티"""
    __tablename__ = 'surveys'
    
    survey_id = Column(String(255), primary_key=True, index=True)
    corporation_id = Column(String(255), nullable=False, index=True)  # corporation ID (외래키 제약 조건 제거)
    content_hash = Column(String(255), nullable=True, index=True)  # 설문 내용 해시값 (동일 내용 판단용)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    total_categories = Column(Integer, nullable=False)
    categories = Column(Text, nullable=False)  # 카테고리 데이터 저장
    excel_data = Column(Text, nullable=True)   # 엑셀 데이터 저장
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class SurveyResponseEntity(Base):
    """설문 응답 엔티티"""
    __tablename__ = 'survey_responses'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    participant_id = Column(String(255), nullable=False, index=True)
    survey_id = Column(String(255), ForeignKey('surveys.survey_id'), nullable=False, index=True)  # surveys 테이블의 survey_id 참조
    corporation_id = Column(String(255), nullable=False, index=True)  # corporation ID (외래키 제약 조건 제거)
    participant_name = Column(String(255), nullable=False)
    participant_company = Column(String(255), nullable=False)
    participant_position = Column(String(255), nullable=False)
    participant_email = Column(String(255), nullable=False, index=True)
    responses = Column(Text, nullable=False)  # 응답 데이터 저장
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
