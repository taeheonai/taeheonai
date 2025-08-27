from fastapi import APIRouter, Depends, Query, HTTPException, Path, Body
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.domain.controller.corporation_controller import CorporationController
from app.domain.schema.corporation_schema import (
    CorporationCreate, 
    CorporationUpdate, 
    CorporationResponse,
    CorporationListResponse
)
from app.common.database import get_db

logger = logging.getLogger(__name__)

# 기업 정보 라우터 생성
corporation_router = APIRouter(prefix="/v1/corporations", tags=["corporations"])

# CorporationController 인스턴스 생성
corporation_controller = CorporationController()

@corporation_router.get("", summary="기업 목록 조회 (슬래시 없음)", response_model=CorporationListResponse)
async def get_all_corporations_no_slash(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0, description="건너뛸 개수"),
    limit: int = Query(100, ge=1, le=1000, description="가져올 개수")
):
    """모든 기업 정보를 조회합니다. (슬래시 없음)"""
    try:
        logger.info(f"📝 기업 목록 조회 요청 (슬래시 없음): skip={skip}, limit={limit}")
        
        result = await corporation_controller.get_all_corporations(db, skip, limit)
        
        logger.info(f"✅ 기업 목록 조회 성공 (슬래시 없음): {result.count}개")
        return result
        
    except Exception as e:
        logger.error(f"❌ 기업 목록 조회 실패 (슬래시 없음): {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"기업 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )

@corporation_router.get("/", summary="기업 목록 조회 (슬래시 있음)", response_model=CorporationListResponse)
async def get_all_corporations_with_slash(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0, description="건너뛸 개수"),
    limit: int = Query(100, ge=1, le=1000, description="가져올 개수")
):
    """모든 기업 정보를 조회합니다. (슬래시 있음)"""
    try:
        logger.info(f"📝 기업 목록 조회 요청 (슬래시 있음): skip={skip}, limit={limit}")
        
        result = await corporation_controller.get_all_corporations(db, skip, limit)
        
        logger.info(f"✅ 기업 목록 조회 성공 (슬래시 있음): {result.count}개")
        return result
        
    except Exception as e:
        logger.error(f"❌ 기업 목록 조회 실패 (슬래시 있음): {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"기업 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )

@corporation_router.get("/{corporation_id}", summary="기업 정보 조회", response_model=CorporationResponse)
async def get_corporation(
    corporation_id: int = Path(..., description="기업 ID"),
    db: AsyncSession = Depends(get_db)
):
    """ID로 기업 정보를 조회합니다."""
    try:
        logger.info(f"📝 기업 정보 조회 요청: ID={corporation_id}")
        
        result = await corporation_controller.get_corporation_by_id(db, corporation_id)
        
        logger.info(f"✅ 기업 정보 조회 성공: ID={corporation_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 기업 정보 조회 실패: ID={corporation_id}, 오류={e}")
        raise HTTPException(
            status_code=500, 
            detail=f"기업 정보 조회 중 오류가 발생했습니다: {str(e)}"
        )

@corporation_router.get("/code/{corp_code}", summary="기업 코드로 조회", response_model=CorporationResponse)
async def get_corporation_by_code(
    corp_code: str = Path(..., description="기업 코드"),
    db: AsyncSession = Depends(get_db)
):
    """기업 코드로 기업 정보를 조회합니다."""
    try:
        logger.info(f"📝 기업 코드로 조회 요청: 코드={corp_code}")
        
        result = await corporation_controller.get_corporation_by_corp_code(db, corp_code)
        
        logger.info(f"✅ 기업 코드로 조회 성공: 코드={corp_code}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 기업 코드로 조회 실패: 코드={corp_code}, 오류={e}")
        raise HTTPException(
            status_code=500, 
            detail=f"기업 정보 조회 중 오류가 발생했습니다: {str(e)}"
        )

@corporation_router.get("/search", summary="기업 검색", response_model=list[CorporationResponse])
async def search_corporations(
    query: str = Query(..., description="검색할 기업명 또는 산업"),
    limit: int = Query(20, ge=1, le=100, description="검색 결과 개수"),
    db: AsyncSession = Depends(get_db)
):
    """기업명이나 산업으로 기업을 검색합니다."""
    try:
        logger.info(f"📝 기업 검색 요청: 쿼리={query}, 제한={limit}")
        
        result = await corporation_controller.search_corporations(db, query, limit)
        
        logger.info(f"✅ 기업 검색 성공: {len(result)}개 결과")
        return result
        
    except Exception as e:
        logger.error(f"❌ 기업 검색 실패: 쿼리={query}, 오류={e}")
        raise HTTPException(
            status_code=500, 
            detail=f"기업 검색 중 오류가 발생했습니다: {str(e)}"
        )

@corporation_router.post("/", summary="기업 정보 생성", response_model=CorporationResponse)
async def create_corporation(
    corporation_data: CorporationCreate,
    db: AsyncSession = Depends(get_db)
):
    """새 기업 정보를 생성합니다."""
    try:
        logger.info(f"📝 기업 정보 생성 요청: {corporation_data.companyname}")
        
        result = await corporation_controller.create_corporation(db, corporation_data)
        
        logger.info(f"✅ 기업 정보 생성 성공: ID={result.id}")
        return result
        
    except Exception as e:
        logger.error(f"❌ 기업 정보 생성 실패: {e}")
        raise HTTPException(
            status_code=400, 
            detail=f"기업 정보 생성 중 오류가 발생했습니다: {str(e)}"
        )

@corporation_router.put("/{corporation_id}", summary="기업 정보 수정", response_model=CorporationResponse)
async def update_corporation(
    update_data: CorporationUpdate = Body(..., description="수정할 기업 정보"),
    corporation_id: int = Path(..., description="기업 ID"),
    db: AsyncSession = Depends(get_db)
):
    """기업 정보를 수정합니다."""
    try:
        logger.info(f"📝 기업 정보 수정 요청: ID={corporation_id}")
        
        result = await corporation_controller.update_corporation(db, corporation_id, update_data)
        
        logger.info(f"✅ 기업 정보 수정 성공: ID={corporation_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 기업 정보 수정 실패: ID={corporation_id}, 오류={e}")
        raise HTTPException(
            status_code=400, 
            detail=f"기업 정보 수정 중 오류가 발생했습니다: {str(e)}"
        )

@corporation_router.delete("/{corporation_id}", summary="기업 정보 삭제")
async def delete_corporation(
    corporation_id: int = Path(..., description="기업 ID"),
    db: AsyncSession = Depends(get_db)
):
    """기업 정보를 삭제합니다."""
    try:
        logger.info(f"📝 기업 정보 삭제 요청: ID={corporation_id}")
        
        result = await corporation_controller.delete_corporation(db, corporation_id)
        
        logger.info(f"✅ 기업 정보 삭제 성공: ID={corporation_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 기업 정보 삭제 실패: ID={corporation_id}, 오류={e}")
        raise HTTPException(
            status_code=500, 
            detail=f"기업 정보 삭제 중 오류가 발생했습니다: {str(e)}"
        )

@corporation_router.get("/validate/{corporation_id}", summary="기업 ID 유효성 검증")
async def validate_corporation_exists(
    corporation_id: int = Path(..., description="검증할 기업 ID"),
    db: AsyncSession = Depends(get_db)
):
    """기업 ID가 유효한지 검증합니다. (다른 서비스에서 사용)"""
    try:
        logger.info(f"📝 기업 ID 유효성 검증 요청: ID={corporation_id}")
        
        result = await corporation_controller.validate_corporation_exists(db, corporation_id)
        
        logger.info(f"✅ 기업 ID 유효성 검증 성공: ID={corporation_id}, 유효={result}")
        return {"valid": result, "corporation_id": corporation_id}
        
    except Exception as e:
        logger.error(f"❌ 기업 ID 유효성 검증 실패: ID={corporation_id}, 오류={e}")
        raise HTTPException(
            status_code=500, 
            detail=f"기업 ID 유효성 검증 중 오류가 발생했습니다: {str(e)}"
        )
