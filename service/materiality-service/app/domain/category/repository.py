"""
Category Repository - BaseModel을 받아서 데이터베이스 작업을 수행하는 계층
데이터베이스 연결을 담당하며, BaseModel과 Entity 간의 변환을 처리
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.common.database.issuepool_db import get_db
import logging

logger = logging.getLogger(__name__)

class CategoryRepository:
    """카테고리 리포지토리 - 데이터베이스에서 카테고리 정보 조회"""
    
    def __init__(self):
        pass
    
    async def get_all_categories(self, include_base_issue_pools: bool = True, 
                                include_esg_classification: bool = True,
                                limit: int = None, offset: int = None):
        """모든 카테고리 정보 조회 - ESG 분류와 base issue pool 정보 포함"""
        try:
            logger.info("🔍 리포지토리: 모든 카테고리 정보 조회")
            
            # 데이터베이스 연결
            async for db in get_db():
                # 기본 카테고리 조회 쿼리
                base_query = """
                    SELECT 
                        mc.id,
                        mc.category_name,
                        ec.id as esg_id,
                        ec.esg as esg_name
                    FROM materiality_category mc
                    LEFT JOIN esg_classification ec ON mc.esg_classification_id = ec.id
                    ORDER BY mc.id
                """
                
                # LIMIT과 OFFSET 적용
                if limit:
                    base_query += f" LIMIT {limit}"
                if offset:
                    base_query += f" OFFSET {offset}"
                
                # 카테고리 기본 정보 조회
                result = await db.execute(text(base_query))
                categories_data = result.fetchall()
                
                logger.info(f"✅ 리포지토리: {len(categories_data)}개 카테고리 기본 정보 조회 완료")
                
                # 각 카테고리에 대해 base issue pool 정보 조회
                categories = []
                for cat_data in categories_data:
                    category = {
                        "id": cat_data.id,
                        "category_name": cat_data.category_name,
                        "esg_classification": {
                            "id": cat_data.esg_id,
                            "esg": cat_data.esg_name
                        } if cat_data.esg_id and include_esg_classification else None
                    }
                    
                    # Base issue pool 정보 조회 (요청된 경우에만)
                    if include_base_issue_pools:
                        base_issue_pools = await self._get_base_issue_pools(db, cat_data.id)
                        category["base_issue_pools"] = base_issue_pools
                    
                    categories.append(category)
                
                logger.info(f"✅ 리포지토리: 모든 카테고리 정보 조회 완료 - {len(categories)}개 카테고리")
                return categories
                    
        except Exception as e:
            logger.error(f"❌ 리포지토리: 모든 카테고리 정보 조회 중 오류 - {str(e)}")
            raise
    
    async def _get_base_issue_pools(self, db: AsyncSession, category_id: int):
        """특정 카테고리의 base issue pool 정보 조회"""
        try:
            query = """
                SELECT 
                    id,
                    base_issue_pool,
                    issue_pool,
                    ranking,
                    publish_year
                FROM issuepool 
                WHERE category_id = :category_id
                ORDER BY ranking, id
            """
            
            result = await db.execute(text(query), {"category_id": category_id})
            base_issue_pools = result.fetchall()
            
            return [
                {
                    "id": item.id,
                    "base_issue_pool": item.base_issue_pool,
                    "issue_pool": item.issue_pool,
                    "ranking": item.ranking,
                    "publish_year": item.publish_year
                }
                for item in base_issue_pools
            ]
            
        except Exception as e:
            logger.error(f"❌ 리포지토리: base issue pool 조회 중 오류 - {str(e)}")
            return []
