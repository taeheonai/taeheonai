"""
Issue Pool Domain Entity - SQLAlchemy 모델
"""
from sqlalchemy import Column, Integer, Text, ForeignKey
from app.common.database.survey_db import Base

class IssuePoolEntity(Base):
    """이슈풀 SQLAlchemy 모델"""
    __tablename__ = "issuepool"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    corporation_id = Column(Integer, ForeignKey("corporation.id"), nullable=False)
    publish_year = Column(Integer, nullable=False)
    ranking = Column(Integer, nullable=False)
    base_issue_pool = Column(Text, nullable=False)
    issue_pool = Column(Text, nullable=False)
    category_id = Column(Integer, ForeignKey("materiality_category.id"), nullable=False)
    esg_classification_id = Column(Integer, ForeignKey("esg_classification.id"), nullable=False)
