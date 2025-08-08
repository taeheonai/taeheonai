from sqlalchemy import Column, String, DateTime, BigInteger
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

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
