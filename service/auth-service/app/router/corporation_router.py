from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import logging

from app.domain.corporation.corporation_controller import CorporationController
from app.domain.corporation.corporation_schema import CorporationCreate, CorporationSearch
from app.common.database import get_db

logger = logging.getLogger(__name__)

# 기업 정보 라우터 생성
corporation_router = APIRouter(prefix="/v1/corporations", tags=["corporations"])

# CorporationController 인스턴스 생성
corporation_controller = CorporationController()

@corporation_router.post("/", summary="기업 정보 생성")
async def create_corporation(
    request: CorporationCreate, 
    db: AsyncSession = Depends(get_db)
):
    """새로운 기업 정보를 생성합니다."""
    try:
        logger.info(f"📝 기업 정보 생성 요청: {request.name}")
        
        result = await corporation_controller.create_corporation(request, db)
        
        logger.info(f"✅ 기업 정보 생성 성공: {request.name}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 기업 정보 생성 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"기업 정보 생성 중 오류가 발생했습니다: {str(e)}"
        )

@corporation_router.get("/search", summary="기업 검색")
async def search_corporations(
    q: str = Query(..., min_length=1, description="검색어"),
    limit: int = Query(20, ge=1, le=100, description="검색 결과 수"),
    db: AsyncSession = Depends(get_db)
):
    """기업명으로 기업을 검색합니다."""
    try:
        logger.info(f"📝 기업 검색 요청: {q}")
        
        search_data = CorporationSearch(q=q)
        result = await corporation_controller.search_corporations(search_data, db)
        
        logger.info(f"✅ 기업 검색 성공: {len(result.get('data', []))}개 결과")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 기업 검색 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"기업 검색 중 오류가 발생했습니다: {str(e)}"
        )

@corporation_router.get("/{corporation_id}", summary="기업 정보 조회")
async def get_corporation(
    corporation_id: int, 
    db: AsyncSession = Depends(get_db)
):
    """ID로 기업 정보를 조회합니다."""
    try:
        logger.info(f"📝 기업 정보 조회 요청: ID {corporation_id}")
        
        result = await corporation_controller.get_corporation_by_id(corporation_id, db)
        
        logger.info(f"✅ 기업 정보 조회 성공: ID {corporation_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 기업 정보 조회 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"기업 정보 조회 중 오류가 발생했습니다: {str(e)}"
        )

@corporation_router.get("/", summary="기업 목록 조회")
async def get_all_corporations(
    skip: int = Query(0, ge=0, description="건너뛸 개수"),
    limit: int = Query(100, ge=1, le=1000, description="가져올 개수"),
    db: AsyncSession = Depends(get_db)
):
    """모든 기업 정보를 조회합니다."""
    try:
        logger.info(f"📝 기업 목록 조회 요청: skip={skip}, limit={limit}")
        
        result = await corporation_controller.get_all_corporations(skip, limit, db)
        
        logger.info(f"✅ 기업 목록 조회 성공: {result.get('count', 0)}개")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 기업 목록 조회 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"기업 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )
