# app/domain/repository/issuepool_repository.py
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, desc, func, select
from sqlalchemy.orm import selectinload
from app.domain.entity.issuepool_entity import IssuePool
from app.domain.schema.issuepool_schema import IssuePoolDTO, IssuePoolFilter


class IssuePoolRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, issuepool_dto: IssuePoolDTO) -> IssuePool:
        """BaseModel을 Entity로 변환하여 데이터베이스에 생성"""
        issuepool_entity = IssuePool(
            corporation_id=issuepool_dto.corporation_id,
            publish_year=issuepool_dto.publish_year,
            ranking=issuepool_dto.ranking,
            issue_pool=issuepool_dto.issue_pool,
            category_id=issuepool_dto.category_id,
            esg_classification_id=issuepool_dto.esg_classification_id
        )
        
        self.db.add(issuepool_entity)
        await self.db.commit()
        await self.db.refresh(issuepool_entity)
        return issuepool_entity

    async def get_by_id(self, issuepool_id: int) -> Optional[IssuePool]:
        """ID로 IssuePool 조회"""
        result = await self.db.execute(
            select(IssuePool).where(IssuePool.id == issuepool_id)
        )
        return result.scalar_one_or_none()

    async def get_by_corporation_and_year(self, corporation_id: int, publish_year: int) -> List[IssuePool]:
        """기업 ID와 발행 연도로 IssuePool 목록 조회"""
        result = await self.db.execute(
            select(IssuePool)
            .where(
                and_(
                    IssuePool.corporation_id == corporation_id,
                    IssuePool.publish_year == publish_year
                )
            )
            .order_by(IssuePool.ranking)
        )
        return result.scalars().all()

    async def get_filtered(self, filter_dto: IssuePoolFilter) -> List[IssuePool]:
        """필터 조건에 따른 IssuePool 목록 조회"""
        query = select(IssuePool)
        
        # corporation_id 필터
        if filter_dto.corporation_id:
            query = query.where(IssuePool.corporation_id == filter_dto.corporation_id)
        
        # publish_year 필터
        if filter_dto.publish_year:
            query = query.where(IssuePool.publish_year == filter_dto.publish_year)
        
        # 랭킹 순으로 정렬
        query = query.order_by(IssuePool.ranking)
        
        # 랜덤 정렬 여부
        if filter_dto.random:
            query = query.order_by(func.random())
        
        # 제한
        if filter_dto.limit > 0:
            query = query.limit(filter_dto.limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def update(self, issuepool_id: int, issuepool_dto: IssuePoolDTO) -> Optional[IssuePool]:
        """BaseModel을 Entity로 변환하여 데이터베이스 업데이트"""
        issuepool_entity = await self.get_by_id(issuepool_id)
        if not issuepool_entity:
            return None
        
        # DTO의 값으로 Entity 업데이트
        issuepool_entity.corporation_id = issuepool_dto.corporation_id
        issuepool_entity.publish_year = issuepool_dto.publish_year
        issuepool_entity.ranking = issuepool_dto.ranking
        issuepool_entity.issue_pool = issuepool_dto.issue_pool
        issuepool_entity.category_id = issuepool_dto.category_id
        issuepool_entity.esg_classification_id = issuepool_dto.esg_classification_id
        
        await self.db.commit()
        await self.db.refresh(issuepool_entity)
        return issuepool_entity

    async def delete(self, issuepool_id: int) -> bool:
        """ID로 IssuePool 삭제"""
        issuepool_entity = await self.get_by_id(issuepool_id)
        if not issuepool_entity:
            return False
        
        await self.db.delete(issuepool_entity)
        await self.db.commit()
        return True

    async def get_by_category(self, category_id: int, corporation_id: Optional[int] = None) -> List[IssuePool]:
        """카테고리 ID로 IssuePool 목록 조회"""
        query = select(IssuePool).where(IssuePool.category_id == category_id)
        
        if corporation_id:
            query = query.where(IssuePool.corporation_id == corporation_id)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_esg_classification(self, esg_classification_id: int, corporation_id: Optional[int] = None) -> List[IssuePool]:
        """ESG 분류로 IssuePool 목록 조회"""
        query = select(IssuePool).where(IssuePool.esg_classification_id == esg_classification_id)
        
        if corporation_id:
            query = query.where(IssuePool.corporation_id == corporation_id)
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def bulk_create(self, issuepool_dtos: List[IssuePoolDTO]) -> List[IssuePool]:
        """DTO 리스트를 Entity 리스트로 변환하여 일괄 생성"""
        issuepool_entities = []
        for dto in issuepool_dtos:
            entity = IssuePool(
                corporation_id=dto.corporation_id,
                publish_year=dto.publish_year,
                ranking=dto.ranking,
                issue_pool=dto.issue_pool,
                category_id=dto.category_id,
                esg_classification_id=dto.esg_classification_id
            )
            issuepool_entities.append(entity)
        
        self.db.add_all(issuepool_entities)
        await self.db.commit()
        
        # 생성된 엔티티들을 새로고침
        for entity in issuepool_entities:
            await self.db.refresh(entity)
        
        return issuepool_entities

    async def get_ranking_statistics(self, corporation_id: int, publish_year: int) -> dict:
        """랭킹 통계 정보 조회"""
        # 전체 개수
        total_count_result = await self.db.execute(
            select(func.count(IssuePool.id))
            .where(
                and_(
                    IssuePool.corporation_id == corporation_id,
                    IssuePool.publish_year == publish_year
                )
            )
        )
        total_count = total_count_result.scalar()
        
        # 평균 랭킹
        avg_ranking_result = await self.db.execute(
            select(func.avg(IssuePool.ranking))
            .where(
                and_(
                    IssuePool.corporation_id == corporation_id,
                    IssuePool.publish_year == publish_year
                )
            )
        )
        avg_ranking = avg_ranking_result.scalar()
        
        # 최고 랭킹
        min_ranking_result = await self.db.execute(
            select(func.min(IssuePool.ranking))
            .where(
                and_(
                    IssuePool.corporation_id == corporation_id,
                    IssuePool.publish_year == publish_year
                )
            )
        )
        min_ranking = min_ranking_result.scalar()
        
        # 최저 랭킹
        max_ranking_result = await self.db.execute(
            select(func.max(IssuePool.ranking))
            .where(
                and_(
                    IssuePool.corporation_id == corporation_id,
                    IssuePool.publish_year == publish_year
                )
            )
        )
        max_ranking = max_ranking_result.scalar()
        
        return {
            "total_count": total_count,
            "average_ranking": float(avg_ranking) if avg_ranking else 0,
            "min_ranking": min_ranking,
            "max_ranking": max_ranking
        }

    async def get_random_issuepools(self, limit: int = 10) -> List[IssuePool]:
        """랜덤으로 IssuePool 목록 조회"""
        result = await self.db.execute(
            select(IssuePool)
            .order_by(func.random())
            .limit(limit)
        )
        return result.scalars().all()

    async def process_issuepool_creation(self, issuepool_dto: IssuePoolDTO) -> IssuePool:
        """IssuePool 생성 처리"""
        return await self.create(issuepool_dto)

    async def process_issuepool_update(self, issuepool_id: int, issuepool_dto: IssuePoolDTO) -> Optional[IssuePool]:
        """IssuePool 업데이트 처리"""
        return await self.update(issuepool_id, issuepool_dto)
