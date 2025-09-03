"""
Corporation Entity - SQLAlchemy 모델
"""
from sqlalchemy import Column, Integer, Text, String
from sqlalchemy.ext.declarative import declarative_base

# Base 클래스 정의
Base = declarative_base()

class CorporationEntity(Base):
    """기업 정보 SQLAlchemy 모델"""
    __tablename__ = "corporation"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    corp_code = Column(Text, nullable=False, unique=True)
    companyname = Column(Text, nullable=False, unique=True)
    market = Column(Text, nullable=True)
    dart_code = Column(Text, nullable=True)

