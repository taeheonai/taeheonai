"""
Media Repository - BaseModel을 받아서 데이터베이스 작업을 수행하는 계층
데이터베이스 연결을 담당하며, BaseModel과 Entity 간의 변환을 처리
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.domain.media.schema import MaterialityCategoryRequest
from app.domain.media.entity import MaterialityCategoryEntity
from app.common.database.materiality_category_db import get_db
import logging

logger = logging.getLogger(__name__)

class MediaRepository:
    """미디어 리포지토리 - 중대성 카테고리 관련 데이터베이스 작업"""
    
    def __init__(self):
        pass
    
    async def get_all_materiality_categories(self):
        """모든 중대성 카테고리 조회 - BaseModel 리스트 반환"""
        try:
            logger.info("🔍 리포지토리: 모든 중대성 카테고리 조회")
            
            # 데이터베이스 연결
            async for db in get_db():
                query = select(MaterialityCategoryEntity)
                result = await db.execute(query)
                category_entities = result.scalars().all()
                
                logger.info(f"🔍 DB에서 가져온 Entity 데이터: {len(category_entities)}개")
                for i, entity in enumerate(category_entities):
                    # logger.info(f"  [{i+1}] Entity - category_name: '{entity.category_name}', esg_classification_id: {entity.esg_classification_id}")
                    pass
                
                # Entity들을 BaseModel로 변환하여 반환
                category_models = []
                for i, category_entity in enumerate(category_entities):
                    category_model = MaterialityCategoryRequest(
                        category_name=category_entity.category_name,
                        esg_classification_id=category_entity.esg_classification_id
                    )
                    category_models.append(category_model)
                    # logger.info(f"  [{i+1}] BaseModel 변환 - category_name: '{category_model.category_name}', esg_classification_id: {category_model.esg_classification_id}")
                
                logger.info(f"✅ 리포지토리: 모든 중대성 카테고리 조회 완료 - {len(category_models)}개 카테고리")
                return category_models
                    
        except Exception as e:
            logger.error(f"❌ 리포지토리: 중대성 카테고리 조회 중 오류 - {str(e)}")
            raise
    
    async def find_materiality_category_by_name(self, category_name: str):
        """카테고리명으로 중대성 카테고리 조회 - BaseModel 반환"""
        try:
            logger.info(f"🔍 리포지토리: 카테고리명으로 중대성 카테고리 조회 - {category_name}")
            
            # 데이터베이스 연결
            async for db in get_db():
                query = select(MaterialityCategoryEntity).where(MaterialityCategoryEntity.category_name == category_name)
                result = await db.execute(query)
                category_entity = result.scalar_one_or_none()
                
                if category_entity:
                    # Entity를 BaseModel로 변환하여 반환
                    category_model = MaterialityCategoryRequest(
                        category_name=category_entity.category_name,
                        esg_classification_id=category_entity.esg_classification_id
                    )
                    logger.info(f"✅ 리포지토리: 중대성 카테고리 조회 성공 - {category_name}")
                    return category_model
                else:
                    logger.info(f"❌ 리포지토리: 중대성 카테고리 없음 - {category_name}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ 리포지토리: 카테고리명 조회 중 오류 - {str(e)}")
            raise
