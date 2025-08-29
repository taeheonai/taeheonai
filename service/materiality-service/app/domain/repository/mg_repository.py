# app/domain/repository/mg_repository.py
from typing import List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entity.issuepool_entity import IssuePool
from app.domain.entity.mg_entity import IssuePoolGRIEntity

class MGRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_issuepools_by_ids(self, issuepool_ids: List[int]) -> List[IssuePool]:
        """ID 리스트로 IssuePool 정보 조회"""
        try:
            query = (
                select(IssuePool)
                .where(IssuePool.id.in_(issuepool_ids))
                .order_by(IssuePool.ranking)
            )
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            print(f"IssuePool 조회 실패: {e}")
            return []

    async def get_gri_indexes_by_category(self, category_id: int) -> List[Dict[str, Any]]:
        """카테고리 ID로 GRI 인덱스 조회"""
        try:
            print(f"[MG Repository] 카테고리 {category_id}로 GRI 인덱스 조회 시작")
            
            query = (
                select(
                    IssuePoolGRIEntity.id.label("gri_id"),
                    IssuePoolGRIEntity.gri_index,
                    IssuePoolGRIEntity.frequency,
                    IssuePoolGRIEntity.grade,
                )
                .where(IssuePoolGRIEntity.category_id == category_id)
                .order_by(IssuePoolGRIEntity.frequency.desc(), IssuePoolGRIEntity.grade)
            )
            
            print(f"[MG Repository] SQL 쿼리: {query}")
            result = await self.db.execute(query)
            rows = result.mappings().all()
            
            print(f"[MG Repository] 카테고리 {category_id}에서 {len(rows)}개 GRI 인덱스 조회됨")
            if rows:
                print(f"[MG Repository] 첫 번째 결과: {rows[0]}")
            
            return rows
            
        except Exception as e:
            print(f"[MG Repository] GRI 인덱스 조회 실패: {e}")
            import traceback
            traceback.print_exc()
            return []

    async def get_indexes_for_issuepools(self, issuepool_ids: List[int]) -> List[Dict[str, Any]]:
        """IssuePool별로 그룹화된 GRI 인덱스 데이터 반환"""
        try:
            print(f"[MG Repository] {len(issuepool_ids)}개 IssuePool에 대한 GRI 인덱스 조회 시작")
            print(f"[MG Repository] IssuePool IDs: {issuepool_ids}")
            
            # 1단계: IssuePool 정보 조회
            issuepools = await self.get_issuepools_by_ids(issuepool_ids)
            print(f"[MG Repository] {len(issuepools)}개 IssuePool 조회됨")
            
            # 2단계: 각 IssuePool에 대한 GRI 인덱스 조회 및 그룹화
            result = []
            for issuepool in issuepools:
                print(f"[MG Repository] IssuePool {issuepool.id} (카테고리: {issuepool.category_id}) 처리 중...")
                gri_indexes = await self.get_gri_indexes_by_category(issuepool.category_id)
                
                result.append({
                    "issuepool_id": issuepool.id,
                    "issue_pool": issuepool.issue_pool,
                    "ranking": issuepool.ranking,
                    "publish_year": issuepool.publish_year,
                    "corporation_id": issuepool.corporation_id,
                    "category_id": issuepool.category_id,
                    "esg_classification_id": issuepool.esg_classification_id,
                    "gri_indexes": gri_indexes
                })
            
            print(f"[MG Repository] 총 {len(result)}개 IssuePool 그룹화 완료")
            return result
            
        except Exception as e:
            print(f"[MG Repository] MG Index 조회 실패: {e}")
            import traceback
            traceback.print_exc()
            return []
