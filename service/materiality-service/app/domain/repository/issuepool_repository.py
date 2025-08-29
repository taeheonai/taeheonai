# app/domain/repository/issuepool_repository.py
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from app.domain.entity.issuepool_entity import IssuePool
from app.domain.schema.issuepool_schema import IssuePoolDTO, IssuePoolFilter


class IssuePoolRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, issuepool_dto: IssuePoolDTO) -> IssuePool:
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
        self.db.commit()
        self.db.refresh(issuepool_entity)
        return issuepool_entity

    def get_by_id(self, issuepool_id: int) -> Optional[IssuePool]:
        """ID로 IssuePool 조회"""
        return self.db.query(IssuePool).filter(IssuePool.id == issuepool_id).first()

    def get_by_corporation_and_year(self, corporation_id: int, publish_year: int) -> List[IssuePool]:
        """기업 ID와 발행 연도로 IssuePool 목록 조회"""
        return self.db.query(IssuePool).filter(
            and_(
                IssuePool.corporation_id == corporation_id,
                IssuePool.publish_year == publish_year
            )
        ).order_by(IssuePool.ranking).all()

    def get_filtered(self, filter_dto: IssuePoolFilter) -> List[IssuePool]:
        """필터 조건에 따른 IssuePool 목록 조회"""
        query = self.db.query(IssuePool)
        
        # corporation_id 필터
        if filter_dto.corporation_id:
            query = query.filter(IssuePool.corporation_id == filter_dto.corporation_id)
        
        # publish_year 필터
        if filter_dto.publish_year:
            query = query.filter(IssuePool.publish_year == filter_dto.publish_year)
        
        # 랭킹 순으로 정렬
        query = query.order_by(IssuePool.ranking)
        
        # 랜덤 정렬 여부
        if filter_dto.random:
            query = query.order_by(func.random())
        
        # 제한
        if filter_dto.limit > 0:
            query = query.limit(filter_dto.limit)
        
        return query.all()

    def update(self, issuepool_id: int, issuepool_dto: IssuePoolDTO) -> Optional[IssuePool]:
        """BaseModel을 Entity로 변환하여 데이터베이스 업데이트"""
        issuepool_entity = self.get_by_id(issuepool_id)
        if not issuepool_entity:
            return None
        
        # DTO의 값으로 Entity 업데이트
        issuepool_entity.corporation_id = issuepool_dto.corporation_id
        issuepool_entity.publish_year = issuepool_dto.publish_year
        issuepool_entity.ranking = issuepool_dto.ranking
        issuepool_entity.issue_pool = issuepool_dto.issue_pool
        issuepool_entity.category_id = issuepool_dto.category_id
        issuepool_entity.esg_classification_id = issuepool_dto.esg_classification_id
        
        self.db.commit()
        self.db.refresh(issuepool_entity)
        return issuepool_entity

    def delete(self, issuepool_id: int) -> bool:
        """ID로 IssuePool 삭제"""
        issuepool_entity = self.get_by_id(issuepool_id)
        if not issuepool_entity:
            return False
        
        self.db.delete(issuepool_entity)
        self.db.commit()
        return True

    def get_by_category(self, category_id: int, corporation_id: Optional[int] = None) -> List[IssuePool]:
        """카테고리 ID로 IssuePool 목록 조회"""
        query = self.db.query(IssuePool).filter(IssuePool.category_id == category_id)
        
        if corporation_id:
            query = query.filter(IssuePool.corporation_id == corporation_id)
        
        return query.order_by(IssuePool.ranking).all()

    def get_by_esg_classification(self, esg_classification_id: int, corporation_id: Optional[int] = None) -> List[IssuePool]:
        """ESG 분류로 IssuePool 목록 조회"""
        query = self.db.query(IssuePool).filter(IssuePool.esg_classification_id == esg_classification_id)
        
        if corporation_id:
            query = query.filter(IssuePool.corporation_id == corporation_id)
        
        return query.order_by(IssuePool.ranking).all()

    def get_ranking_statistics(self, corporation_id: int, publish_year: int) -> dict:
        """랭킹 통계 정보 조회"""
        result = self.db.query(
            func.count(IssuePool.id).label('total_count'),
            func.avg(IssuePool.ranking).label('avg_ranking'),
            func.min(IssuePool.ranking).label('min_ranking'),
            func.max(IssuePool.ranking).label('max_ranking')
        ).filter(
            and_(
                IssuePool.corporation_id == corporation_id,
                IssuePool.publish_year == publish_year
            )
        ).first()
        
        return {
            'total_count': result.total_count or 0,
            'avg_ranking': float(result.avg_ranking) if result.avg_ranking else 0,
            'min_ranking': result.min_ranking or 0,
            'max_ranking': result.max_ranking or 0
        }

    def bulk_create(self, issuepool_dtos: List[IssuePoolDTO]) -> List[IssuePool]:
        """여러 IssuePool을 일괄 생성"""
        entities = []
        for dto in issuepool_dtos:
            entity = IssuePool(
                corporation_id=dto.corporation_id,
                publish_year=dto.publish_year,
                ranking=dto.ranking,
                issue_pool=dto.issue_pool,
                category_id=dto.category_id,
                esg_classification_id=dto.esg_classification_id
            )
            entities.append(entity)
        
        self.db.add_all(entities)
        self.db.commit()
        
        # 생성된 엔티티들을 새로고침
        for entity in entities:
            self.db.refresh(entity)
        
        return entities
