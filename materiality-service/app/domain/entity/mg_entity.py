from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Boolean,
    UniqueConstraint, Index
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ENUM as PGEnum
from app.common.database import Base


# ==========================
# 1. IssuePoolGRI
# ==========================
class IssuePoolGRIEntity(Base):
    __tablename__ = "issuepool_gri"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, index=True, nullable=False)
    gri_index = Column(Text, index=True, nullable=False)
    frequency = Column(Integer, default=0)
    grade = Column(String(1), default="C")  # 'A' | 'B' | 'C'

    __table_args__ = (
        UniqueConstraint("category_id", "gri_index", name="uq_category_gri"),
    )


# ==========================
# 2. GriItem
# ==========================
class GriItem(Base):
    __tablename__ = "gri_item"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("gri_category.id", ondelete="CASCADE"), nullable=False, index=True)
    index_no = Column(Text, nullable=False, index=True)  # '2-1', '201-1' 등
    title = Column(Text, nullable=True)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=False), server_default=func.current_timestamp())

    __table_args__ = (
        UniqueConstraint("category_id", "index_no", name="uq_gri_item_category_index"),
        Index("idx_gri_item_indexno", "index_no"),
    )

    # 관계
    questions = relationship(
        "GriQuestion",
        back_populates="item",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


# ==========================
# 3. GriQuestion
# ==========================
QuestionTypeEnum = PGEnum(
    "question",
    "reference",
    name="question_type",
    native_enum=True,
    create_type=False,  # 이미 DB에 만들어진 ENUM을 사용
)


class GriQuestion(Base):
    __tablename__ = "gri_question"

    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(Integer, ForeignKey("gri_item.id", ondelete="CASCADE"), nullable=False, index=True)
    key_alpha = Column(Text, nullable=False)            # 'a', 'b', 'c' ...
    question_text = Column(Text, nullable=False)
    reference_text = Column(Text, nullable=True)
    question_type = Column(QuestionTypeEnum, nullable=False, server_default="question")
    display_order = Column(Integer, default=0)
    required = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=False), server_default=func.current_timestamp())

    __table_args__ = (
        UniqueConstraint("item_id", "key_alpha", name="uq_gri_question_item_key"),
    )

    # 관계
    item = relationship("GriItem", back_populates="questions", lazy="joined")
