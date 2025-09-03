"""
Category Controller - MVC 구조에서 BaseModel을 CategoryService로 전달하는 컨트롤러
"""
import logging
from app.domain.category.service import CategoryService
from app.domain.category.schema import CategoryRequest

logger = logging.getLogger(__name__)

category_controller = CategoryService()

async def get_all_categories(request: CategoryRequest):
    """전체 카테고리 목록 조회"""
    try:
        logger.info("🔍 컨트롤러: 전체 카테고리 목록 조회 요청을 Service로 전달")
        
        # Service를 통해 Repository 호출
        result = await category_controller.get_all_categories(request)
        
        logger.info(f"✅ 컨트롤러: Service 응답 수신 - {result.get('success', False)}")
        return result
        
    except Exception as e:
        logger.error(f"❌ 컨트롤러: Service 호출 중 오류 - {str(e)}")
        raise
