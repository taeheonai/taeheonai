from datetime import datetime
from sqlalchemy import (
    Column, String, DateTime, BigInteger, func, text
)
from app.database import Base

class UserEntity(Base):
    __tablename__ = "users"  # 테이블명을 "users"로 수정 (복수형)

    id = Column(BigInteger, primary_key=True, index=True)
    company_id = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    email = Column(String, nullable=True)
    name = Column(String, nullable=True)
    age = Column(String, nullable=True)
    auth_id = Column(String, unique=True, index=True, nullable=False)
    auth_pw = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())