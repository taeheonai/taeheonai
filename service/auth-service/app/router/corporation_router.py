from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.domain.controller.corporation_controller import CorporationController
from app.common.database import get_db

logger = logging.getLogger(__name__)

# 기업 정보 라우터 생성
corporation_router = APIRouter(prefix="/v1/corporations", tags=["corporations"])

# CorporationController 인스턴스 생성
corporation_controller = CorporationController()

@corporation_router.get("/", summary="기업 목록 조회")
async def get_all_corporations(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0, description="건너뛸 개수"),
    limit: int = Query(100, ge=1, le=1000, description="가져올 개수")
):
    """모든 기업 정보를 조회합니다."""
    try:
        logger.info(f"📝 기업 목록 조회 요청: skip={skip}, limit={limit}")
        
        result = await corporation_controller.get_all_corporations(db, skip, limit)
        
        logger.info(f"✅ 기업 목록 조회 성공: {result.get('count', 0)}개")
        return result
        
    except Exception as e:
        logger.error(f"❌ 기업 목록 조회 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"기업 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )
