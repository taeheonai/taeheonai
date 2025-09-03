"""
Media Domain Entity - SQLAlchemy 모델
"""
from sqlalchemy import Column, Integer, Text, String
from sqlalchemy.ext.declarative import declarative_base

# Base 클래스 정의
Base = declarative_base()

class MaterialityCategoryEntity(Base):
    """중대성 카테고리 SQLAlchemy 모델"""
    __tablename__ = "materiality_category"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_name = Column(Text, nullable=False)
    esg_classification_id = Column(Integer, nullable=False)
