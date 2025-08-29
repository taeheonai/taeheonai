# app/domain/entity/issuepool_entity.py
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, Integer, Text
from app.common.database import Base  # Declarative Base

class IssuePool(Base):
    __tablename__ = "issuepool"

    id: Mapped[int]              = mapped_column(BigInteger, primary_key=True)
    corporation_id: Mapped[int]  = mapped_column(BigInteger, nullable=False)
    publish_year: Mapped[int]    = mapped_column(Integer, nullable=False)
    ranking: Mapped[int]         = mapped_column(Integer, nullable=False)

    base_issue_pool: Mapped[str] = mapped_column(Text, nullable=True)   # 원본 제목(옵션)
    issue_pool: Mapped[str]      = mapped_column(Text, nullable=False)  # 화면 표시명

    category_id: Mapped[int]     = mapped_column(BigInteger, nullable=False)
    esg_classification_id: Mapped[int] = mapped_column(Integer, nullable=False)  # 1:E,2:S,3:G
