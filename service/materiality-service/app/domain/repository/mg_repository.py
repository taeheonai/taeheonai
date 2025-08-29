# app/domain/repository/mg_repository.py
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entity.issuepool_entity import IssuePool
from app.domain.entity.mg_entity import IssuePoolGRIEntity

class MGRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_indexes_for_issuepools(self, issuepool_ids: List[int]):
        # 🔧 JOIN 시 컬럼명 충돌 방지를 위해 별칭 사용
        try:
            query = (
                select(
                    IssuePool.id.label("issuepool_id"),                  # ★ 별칭
                    IssuePool.category_id,
                    IssuePoolGRIEntity.id.label("gri_id"),               # ★ 별칭
                    IssuePoolGRIEntity.gri_index,
                    IssuePoolGRIEntity.frequency,
                    IssuePoolGRIEntity.grade,
                )
                .join(
                    IssuePoolGRIEntity,
                    IssuePoolGRIEntity.category_id == IssuePool.category_id
                )
                .where(IssuePool.id.in_(issuepool_ids))
                .order_by(IssuePool.ranking)
            )
            
            result = await self.db.execute(query)
            return result.mappings().all()  # [{'issuepool_id':..., 'gri_id':..., ...}, ...]
            
        except Exception as e:
            # 에러 발생 시 로그 출력 및 빈 리스트 반환
            print(f"MG Index 조회 실패: {e}")
            return []
