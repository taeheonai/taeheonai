# app/router/issuepool_router.py
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entity.issuepool_entity import IssuePool
from app.domain.schema.issuepool_schema import (
    IssuePoolDTO,
    IssuePoolCreateRequest,
    IssuePoolUpdateRequest,
    IssuePoolFilter,
    IssuePoolListResponse,
    IssuePoolBulkCreateRequest
)
from app.common.database import get_db
from app.domain.service.issuepool_service import IssuePoolService
from app.domain.controller.issuepool_controller import IssuePoolController
import logging

router = APIRouter(prefix="/v1/materiality", tags=["materiality"])
logger = logging.getLogger(__name__)


@router.post("/", response_model=IssuePoolDTO, status_code=status.HTTP_201_CREATED)
async def create_issuepool(
    request_data: IssuePoolCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    """axios로부터 받은 JSON 데이터로 IssuePool 생성"""
    controller = IssuePoolController(db)
    return await controller.create_issuepool(request_data)


@router.get("/{issuepool_id}", response_model=IssuePoolDTO)
async def get_issuepool(
    issuepool_id: int,
    db: AsyncSession = Depends(get_db)
):
    """ID로 IssuePool 조회"""
    controller = IssuePoolController(db)
    return await controller.get_issuepool_by_id(issuepool_id)


@router.get("/corporation/{corporation_id}/year/{publish_year}")
async def get_issuepools_by_corporation_and_year(
    corporation_id: int,
    publish_year: str,
    issuepool_service: IssuePoolService = Depends(IssuePoolService)
) -> List[IssuePoolDTO]:
    """기업 ID와 발행 연도로 IssuePool 목록 조회"""
    try:
        issuepools = await issuepool_service.get_issuepools_by_corporation_and_year(corporation_id, publish_year)
        return [IssuePoolDTO.from_orm(issuepool) for issuepool in issuepools]
    except Exception as e:
        logger.error(f"기업별 연도별 IssuePool 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="기업별 연도별 IssuePool 조회에 실패했습니다.")


@router.put("/{issuepool_id}", response_model=IssuePoolDTO)
async def update_issuepool(
    issuepool_id: int,
    request_data: IssuePoolUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """axios로부터 받은 JSON 데이터로 IssuePool 업데이트"""
    controller = IssuePoolController(db)
    return await controller.update_issuepool(issuepool_id, request_data)


@router.delete("/{issuepool_id}")
async def delete_issuepool(
    issuepool_id: int,
    db: AsyncSession = Depends(get_db)
):
    """IssuePool 삭제"""
    controller = IssuePoolController(db)
    return await controller.delete_issuepool(issuepool_id)


@router.post("/filter", response_model=List[IssuePoolDTO])
async def get_filtered_issuepools(
    filter_data: IssuePoolFilter,
    db: AsyncSession = Depends(get_db)
):
    """필터 조건에 따른 IssuePool 목록 조회"""
    controller = IssuePoolController(db)
    return await controller.get_filtered_issuepools(filter_data.dict())


@router.post("/bulk", response_model=List[IssuePoolDTO], status_code=status.HTTP_201_CREATED)
async def bulk_create_issuepools(
    request_data: IssuePoolBulkCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    """axios로부터 받은 JSON 데이터 리스트로 IssuePool 일괄 생성"""
    controller = IssuePoolController(db)
    return await controller.bulk_create_issuepools(request_data)


@router.get("/category/{category_id}", response_model=List[IssuePoolDTO])
async def get_issuepools_by_category(
    category_id: int,
    corporation_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    """카테고리 ID로 IssuePool 목록 조회"""
    controller = IssuePoolController(db)
    return await controller.get_issuepools_by_category(category_id, corporation_id)


@router.get("/esg/{esg_classification_id}", response_model=List[IssuePoolDTO])
async def get_issuepools_by_esg_classification(
    esg_classification_id: int,
    corporation_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    """ESG 분류로 IssuePool 목록 조회"""
    controller = IssuePoolController(db)
    return await controller.get_issuepools_by_esg_classification(esg_classification_id, corporation_id)


@router.get("/corporation/{corporation_id}/year/{publish_year}/ranking-stats")
async def get_ranking_statistics(
    corporation_id: int,
    publish_year: str,
    issuepool_service: IssuePoolService = Depends(IssuePoolService)
) -> Dict[str, Any]:
    """특정 기업의 특정 연도 랭킹 통계 조회"""
    try:
        return await issuepool_service.get_ranking_statistics(corporation_id, publish_year)
    except Exception as e:
        logger.error(f"랭킹 통계 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="랭킹 통계 조회에 실패했습니다.")


@router.get("/random", response_model=List[IssuePoolDTO])
async def get_random_issuepools(
    limit: int = Query(10, ge=1, le=100, description="가져올 개수"),
    db: AsyncSession = Depends(get_db)
):
    """랜덤으로 IssuePool 목록 조회"""
    controller = IssuePoolController(db)
    return await controller.get_random_issuepools(limit)

@router.get("/random/{limit}", response_model=List[IssuePoolDTO])
async def get_random_issuepools_by_path(
    limit: int = Path(..., ge=1, le=100, description="가져올 개수"),
    db: AsyncSession = Depends(get_db)
):
    """랜덤으로 IssuePool 목록 조회 (경로 파라미터 방식)"""
    controller = IssuePoolController(db)
    return await controller.get_random_issuepools(limit)
