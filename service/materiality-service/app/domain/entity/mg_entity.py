# app/domain/entity/issuepool_gri_entity.py
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, Text
from app.common.database import Base

class IssuePoolGRIEntity(Base):
    __tablename__ = "issuepool_gri"
    id = Column(Integer, primary_key=True)
    category_id = Column(Integer, index=True)
    gri_index = Column(Text, index=True)
    frequency = Column(Integer, default=0)
    grade = Column(String(1), default="C")  # 'A'|'B'|'C'
    __table_args__ = (UniqueConstraint('category_id', 'gri_index', name='uq_category_gri'),)
