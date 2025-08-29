# app/router/issuepool_router.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.domain.controller.issuepool_controller import IssuePoolController
from app.domain.schema.issuepool_schema import (
    IssuePoolDTO,
    IssuePoolCreateRequest,
    IssuePoolUpdateRequest,
    IssuePoolFilter,
    IssuePoolListResponse
)
from app.common.database import get_db

router = APIRouter(prefix="/v1/materiality", tags=["materiality"])


@router.post("/", response_model=IssuePoolDTO, status_code=status.HTTP_201_CREATED)
async def create_issuepool(
    request_data: IssuePoolCreateRequest,
    db: Session = Depends(get_db)
):
    """axios로부터 받은 JSON 데이터로 IssuePool 생성"""
    controller = IssuePoolController(db)
    return controller.create_issuepool(request_data)


@router.get("/{issuepool_id}", response_model=IssuePoolDTO)
async def get_issuepool(
    issuepool_id: int,
    db: Session = Depends(get_db)
):
    """ID로 IssuePool 조회"""
    controller = IssuePoolController(db)
    return controller.get_issuepool_by_id(issuepool_id)


@router.get("/corporation/{corporation_id}/year/{publish_year}", response_model=List[IssuePoolDTO])
async def get_issuepools_by_corporation_and_year(
    corporation_id: int,
    publish_year: int,
    db: Session = Depends(get_db)
):
    """기업 ID와 발행 연도로 IssuePool 목록 조회"""
    controller = IssuePoolController(db)
    return controller.get_issuepools_by_corporation_and_year(corporation_id, publish_year)


@router.put("/{issuepool_id}", response_model=IssuePoolDTO)
async def update_issuepool(
    issuepool_id: int,
    request_data: IssuePoolUpdateRequest,
    db: Session = Depends(get_db)
):
    """axios로부터 받은 JSON 데이터로 IssuePool 업데이트"""
    controller = IssuePoolController(db)
    return controller.update_issuepool(issuepool_id, request_data)


@router.delete("/{issuepool_id}")
async def delete_issuepool(
    issuepool_id: int,
    db: Session = Depends(get_db)
):
    """IssuePool 삭제"""
    controller = IssuePoolController(db)
    return controller.delete_issuepool(issuepool_id)


@router.post("/filter", response_model=List[IssuePoolDTO])
async def get_filtered_issuepools(
    filter_data: IssuePoolFilter,
    db: Session = Depends(get_db)
):
    """필터 조건에 따른 IssuePool 목록 조회"""
    controller = IssuePoolController(db)
    return controller.get_filtered_issuepools(filter_data)


@router.post("/bulk", response_model=List[IssuePoolDTO], status_code=status.HTTP_201_CREATED)
async def bulk_create_issuepools(
    request_data: List[IssuePoolCreateRequest],
    db: Session = Depends(get_db)
):
    """axios로부터 받은 JSON 데이터 리스트로 IssuePool 일괄 생성"""
    controller = IssuePoolController(db)
    return controller.bulk_create_issuepools(request_data)


@router.get("/category/{category_id}", response_model=List[IssuePoolDTO])
async def get_issuepools_by_category(
    category_id: int,
    corporation_id: int = None,
    db: Session = Depends(get_db)
):
    """카테고리 ID로 IssuePool 목록 조회"""
    controller = IssuePoolController(db)
    return controller.service.get_issuepools_by_category(category_id, corporation_id)


@router.get("/esg/{esg_classification_id}", response_model=List[IssuePoolDTO])
async def get_issuepools_by_esg_classification(
    esg_classification_id: int,
    corporation_id: int = None,
    db: Session = Depends(get_db)
):
    """ESG 분류로 IssuePool 목록 조회"""
    controller = IssuePoolController(db)
    return controller.service.get_issuepools_by_esg_classification(esg_classification_id, corporation_id)


@router.get("/statistics/{corporation_id}/{publish_year}")
async def get_ranking_statistics(
    corporation_id: int,
    publish_year: int,
    db: Session = Depends(get_db)
):
    """랭킹 통계 정보 조회"""
    controller = IssuePoolController(db)
    return controller.service.get_ranking_statistics(corporation_id, publish_year)


@router.get("/random/{limit}", response_model=List[IssuePoolDTO])
async def get_random_issuepools(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """랜덤으로 IssuePool 목록 조회 (기본값: 10개)"""
    controller = IssuePoolController(db)
    return controller.get_random_issuepools(limit)
