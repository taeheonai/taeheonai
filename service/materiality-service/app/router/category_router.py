"""
Category Router - 카테고리 관련 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from app.domain.category.controller import category_controller
from app.domain.category.schema import CategoryRequest
import logging
import traceback

logger = logging.getLogger(__name__)

category_router = APIRouter(prefix="/category", tags=["Category"])

@category_router.post("/categories/all", summary="전체 카테고리 목록 조회")
async def get_all_categories(request: CategoryRequest):
    """데이터베이스에서 모든 카테고리와 ESG 분류, base issue pool 정보를 가져옴"""
    try:
        logger.info("🔍 라우터: 전체 카테고리 목록 조회 요청")
        
        # Controller를 통해 Service 호출
        result = await category_controller.get_all_categories(request)
        
        logger.info(f"✅ 라우터: 전체 카테고리 목록 조회 완료 - {len(result.get('categories', []))}개 카테고리")
        return result
        
    except Exception as e:
        logger.error(f"❌ 라우터: 전체 카테고리 목록 조회 중 오류 - {str(e)}")
        logger.error(f"상세 오류: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"카테고리 목록 조회 중 오류가 발생했습니다: {str(e)}")
