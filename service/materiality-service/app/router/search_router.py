"""
Search Router - 기업 검색 관련 API 엔드포인트
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from app.domain.search.controller import search_controller
from app.domain.search.schema import CompanySearchRequest
import logging
import traceback

logger = logging.getLogger(__name__)

search_router = APIRouter(prefix="/search", tags=["Search"])

@search_router.get("/companies", summary="기업 목록 조회")
async def get_companies():
    """corporation 테이블에서 모든 기업 목록을 가져옴"""
    try:
        logger.info("🔍 라우터: 기업 목록 조회 요청")
        
        # Controller를 통해 Service 호출
        result = await search_controller.get_all_companies()
        
        logger.info(f"✅ 라우터: 기업 목록 조회 완료 - {len(result.get('companies', []))}개 기업")
        return result
        
    except Exception as e:
        logger.error(f"❌ 라우터: 기업 목록 조회 중 오류 - {str(e)}")
        logger.error(f"상세 오류: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"기업 목록 조회 중 오류가 발생했습니다: {str(e)}")

@search_router.post("/company", summary="기업명으로 기업 검색")
async def search_company(search_data: CompanySearchRequest):
    """기업명으로 기업 검색"""
    try:
        logger.info(f"🔍 라우터: 기업 검색 요청 - {search_data.companyname}")
        
        # Controller를 통해 Service 호출
        result = await search_controller.search_company(search_data)
        
        logger.info(f"✅ 라우터: 기업 검색 완료 - {result.get('success', False)}")
        return result
        
    except Exception as e:
        logger.error(f"❌ 라우터: 기업 검색 중 오류 - {str(e)}")
        logger.error(f"상세 오류: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"기업 검색 중 오류가 발생했습니다: {str(e)}")
