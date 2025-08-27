from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.common.database import Base

class Corporation(Base):
    """기업 정보 엔티티"""
    __tablename__ = "corporation"

    id = Column(Integer, primary_key=True, index=True)
    corp_code = Column(String, unique=True, index=True, nullable=False)  # 기업 코드
    companyname = Column(String, nullable=False)  # 기업명
    market = Column(String, nullable=True)  # KOSPI, KOSDAQ 등
    dart_code = Column(String, nullable=True)  # DART 코드
    industry = Column(String, nullable=True)  # 산업 분야
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
