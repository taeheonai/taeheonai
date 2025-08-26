from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.common.database import Base

class Corporation(Base):
    """기업 정보 엔티티"""
    __tablename__ = "corporation"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)  # 기업명 (고유)
    industry = Column(String(100), nullable=True)  # 산업 분야
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
