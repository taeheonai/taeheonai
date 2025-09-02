from fastapi import APIRouter, Depends, HTTPException
from typing import List

from app.domain.controller.grireport_controller import GRIReportController
from pydantic import BaseModel
from app.domain.schema.grireport_schema import (
    GRIReportStructureResponse,
    DuplicateGRIIndexInfo,
    ResolveDuplicateGRIRequest
)

class SaveAnswersRequest(BaseModel):
    answers: dict

# API 라우터 설정
router = APIRouter(
    prefix="/v1/report/gri-report",
    tags=["GRI Report"]
)

@router.get(
    "/structure/{corporation_id}",
    response_model=GRIReportStructureResponse,
    summary="GRI 보고서 구조 조회"
)
async def get_report_structure(
    corporation_id: int,
    companyname: str | None = None,
    controller: GRIReportController = Depends()
):
    """
    ESG 섹션별 GRI 보고서 구조를 조회합니다.

    - **corporation_id**: 기업 ID
    - **companyname**: 기업명 (쿼리 파라미터)
    """
    return await controller.get_report_structure(
        corporation_id=corporation_id,
        companyname=companyname
    )

@router.get(
    "/duplicates/{corporation_id}",
    response_model=List[DuplicateGRIIndexInfo],
    summary="중복된 GRI 인덱스 조회"
)
async def find_duplicate_indexes(
    corporation_id: int,
    controller: GRIReportController = Depends()
):
    """
    중복된 GRI 인덱스를 찾습니다.

    - **corporation_id**: 기업 ID
    """
    return await controller.find_duplicate_indexes(
        corporation_id=corporation_id
    )

@router.post(
    "/duplicates/{corporation_id}/resolve",
    response_model=bool,
    summary="중복 GRI 인덱스 해결"
)
async def resolve_duplicate(
    corporation_id: int,
    request: ResolveDuplicateGRIRequest,
    controller: GRIReportController = Depends()
):
    """
    중복된 GRI 인덱스를 해결합니다.

    - **corporation_id**: 기업 ID
    - **request**: 해결할 인덱스 정보
        - standard_code: GRI 표준 코드
        - selected_issuepool_id: 선택한 이슈풀 ID
    """
    return await controller.resolve_duplicate(
        corporation_id=corporation_id,
        request=request
    )

@router.post(
    "/answers/{corporation_id}",
    response_model=bool,
    summary="GRI 답변 저장"
)
async def save_answers(
    corporation_id: int,
    payload: SaveAnswersRequest,
    controller: GRIReportController = Depends()
):
    """
    GRI 답변을 저장합니다.

    - **corporation_id**: 기업 ID
    - **payload**: 저장할 답변 데이터
        - answers: 답변 데이터 딕셔너리
    """
    return await controller.save_materiality_answers(
        corporation_id=corporation_id,
        answers=payload.answers
    )

@router.post(
    "/intake-answers/{corporation_id}",
    response_model=bool,
    summary="GRI Intake 답변 저장 (ESG 분류 없음)"
)
async def save_intake_answers(
    corporation_id: int,
    payload: SaveAnswersRequest,
    controller: GRIReportController = Depends()
):
    """
    GRI Intake 페이지 답변을 저장합니다 (ESG 분류 없이 공통 섹션으로).

    - **corporation_id**: 기업 ID
    - **payload**: 저장할 답변 데이터
        - answers: 답변 데이터 딕셔너리
    """
    return await controller.save_intake_answers(
        corporation_id=corporation_id,
        answers=payload.answers
    )

@router.get(
    "/answers/{corporation_id}",
    response_model=dict,
    summary="GRI 답변 조회"
)
async def get_answers(
    corporation_id: int,
    controller: GRIReportController = Depends()
):
    """
    저장된 GRI 답변을 조회합니다.

    - **corporation_id**: 기업 ID
    """
    return await controller.get_answers(
        corporation_id=corporation_id
    )

@router.get(
    "/intake-answers/{corporation_id}",
    summary="GRI Intake 답변 조회 (ESG 분류 없음)"
)
async def get_intake_answers(
    corporation_id: int,
    controller: GRIReportController = Depends()
):
    """
    GRI Intake 페이지 답변을 조회합니다 (ESG 분류 없이 공통 섹션으로).

    - **corporation_id**: 기업 ID
    """
    return await controller.get_intake_answers(corporation_id=corporation_id)