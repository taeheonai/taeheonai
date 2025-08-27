from sqlalchemy import (
    Column, String, Integer
)
from app.common.database import Base

class UserEntity(Base):
    __tablename__ = "user"  # 테이블명을 "user"로 유지 (데이터베이스 스키마와 일치)

    id = Column(Integer, primary_key=True, index=True)
    corporation_id = Column(Integer, nullable=True)  # ✅ ForeignKey 제거
    industry = Column(String, nullable=True)
    email = Column(String, nullable=True)
    name = Column(String, nullable=True)
    birth = Column(String, nullable=True)  # birth 필드명 유지
    auth_id = Column(String, unique=True, index=True, nullable=False)
    auth_pw = Column(String, nullable=False)