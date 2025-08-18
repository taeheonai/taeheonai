from sqlalchemy import (
    Column, String, Integer
)
from app.common.database import Base

class UserEntity(Base):
    __tablename__ = "user"  # 테이블명을 "user"로 수정 (단수형)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    email = Column(String, nullable=True)
    name = Column(String, nullable=True)
    birth = Column(String, nullable=True)
    auth_id = Column(String, unique=True, index=True, nullable=False)
    auth_pw = Column(String, nullable=False)