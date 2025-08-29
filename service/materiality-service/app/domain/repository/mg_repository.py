# app/domain/repository/mg_repository.py
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entity.issuepool_entity import IssuePool
from app.domain.entity.mg_entity import IssuePoolGRIEntity  # 🔧 올바른 경로로 import

class MGRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_indexes_for_issuepools(self, issuepool_ids: List[int]):
        # 🔧 실제 엔티티를 사용하여 테이블 연동
        try:
            # IssuePool과 IssuePoolGRI를 JOIN하여 실제 데이터 조회
            query = (
                select(
                    IssuePool.id.label("issuepool_id"),
                    IssuePool.category_id,
                    IssuePoolGRIEntity.gri_index,
                    IssuePoolGRIEntity.frequency,
                    IssuePoolGRIEntity.grade
                )
                .join(
                    IssuePoolGRIEntity, 
                    IssuePoolGRIEntity.category_id == IssuePool.category_id
                )
                .where(IssuePool.id.in_(issuepool_ids))
                .order_by(IssuePool.ranking)
            )
            
            result = await self.db.execute(query)
            return result.mappings().all()  # [{issuepool_id:..., category_id:..., ...}, ...]
            
        except Exception as e:
            # 에러 발생 시 로그 출력 및 빈 리스트 반환
            print(f"MG Index 조회 실패: {e}")
            return []
