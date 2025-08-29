# app/domain/repository/mg_repository.py
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entity.issuepool_entity import IssuePoolEntity
from app.domain.entity.issuepool_gri_entity import IssuePoolGRIEntity

class MGRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_indexes_for_issuepools(self, issuepool_ids: List[int]):
        q = (
            select(
                IssuePoolEntity.id.label("issuepool_id"),
                IssuePoolEntity.category_id,
                IssuePoolGRIEntity.gri_index,
                IssuePoolGRIEntity.frequency,
                IssuePoolGRIEntity.grade
            )
            .join(IssuePoolGRIEntity, IssuePoolGRIEntity.category_id == IssuePoolEntity.category_id)
            .where(IssuePoolEntity.id.in_(issuepool_ids))
            .order_by(IssuePoolEntity.ranking)
        )
        res = await self.db.execute(q)
        return res.mappings().all()  # [{issuepool_id:..., category_id:..., ...}, ...]
