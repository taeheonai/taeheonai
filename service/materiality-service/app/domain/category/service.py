"""
Category Service - 카테고리 관련 모든 서비스 통합
BaseModel을 받아서 Repository로 전달하는 중간 계층
"""
import logging
from app.domain.category.repository import CategoryRepository
from app.domain.category.schema import CategoryRequest

logger = logging.getLogger("category_service")

class CategoryService:
    """카테고리 서비스 - BaseModel을 Repository로 전달하는 중간 계층 (DB 연결 없음)"""
    
    def __init__(self):
        self.category_repository = CategoryRepository()
    
    async def get_all_categories(self, request: CategoryRequest) -> dict:
        """전체 카테고리 목록 조회 - Repository를 통해 데이터베이스에서 가져옴"""
        try:
            logger.info("🔍 서비스: 전체 카테고리 목록 조회 요청을 Repository로 전달")
            
            # Repository를 통해 모든 카테고리 정보 조회 (데이터베이스 연결 없음)
            categories = await self.category_repository.get_all_categories(
                include_base_issue_pools=request.include_base_issue_pools,
                include_esg_classification=request.include_esg_classification,
                limit=request.limit,
                offset=request.offset
            )
            
            if categories:
                logger.info(f"✅ 서비스: 카테고리 목록 조회 성공 - {len(categories)}개 카테고리")
                return {
                    "success": True,
                    "message": f"{len(categories)}개 카테고리를 찾았습니다.",
                    "categories": categories,
                    "total_count": len(categories)
                }
            else:
                logger.info("❌ 서비스: 카테고리 목록이 비어있음")
                return {
                    "success": False,
                    "message": "등록된 카테고리가 없습니다.",
                    "categories": [],
                    "total_count": 0
                }
                
        except Exception as e:
            logger.error(f"❌ 서비스: 카테고리 목록 조회 중 오류 - {str(e)}")
            raise
