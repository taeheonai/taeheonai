from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, RootModel, field_validator

from app.domain.controller.grireport_controller import GRIReportController
from app.domain.schema.grireport_schema import (
    GRIReportStructureResponse,
    DuplicateGRIIndexInfo,
    ResolveDuplicateGRIRequest
)

class AnswerUnit(BaseModel):
    answer_text: str = ""
    polished_text: str = ""
    display_mode: str = "prose"

class SectionAnswers(RootModel[Dict[str, AnswerUnit]]):  # "a", "b", "c", "d" 키만 허용
    
    @field_validator("root")
    @classmethod
    def validate_alpha_keys(cls, v):
        valid_keys = {"a", "b", "c", "d"}
        for key in v.keys():
            if key not in valid_keys:
                raise ValueError(f"Invalid key '{key}'. Must be one of: {', '.join(valid_keys)}")
        return v

class SaveAnswersRequest(BaseModel):
    answers: Dict[str, SectionAnswers]  # "2-1", "306-3" 등의 GRI 인덱스
    issuepool_id: Optional[int] = None  # Materiality-GRI에서만 사용
    
    @field_validator("answers")
    @classmethod
    def validate_answers_structure(cls, v):
        for gri_index, section in v.items():
            if not isinstance(section, SectionAnswers):
                raise ValueError(f"Invalid section structure for {gri_index}")
        return v

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
        - issuepool_id: 이슈풀 ID (Materiality-GRI에서만 사용, GRI Intake에서는 생략)
    """
    return await controller.save_answers(
        corporation_id=corporation_id,
        answers=payload.answers,
        issuepool_id=payload.issuepool_id
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
    try:
        # Pydantic 검증이 이미 완료됨 (payload: SaveAnswersRequest)
        # 추가 검증: polished_text가 문자열인지 확인
        for gri_index, section in payload.answers.items():
            for key_alpha, answer in section.root.items():
                if not isinstance(answer.polished_text, str):
                    raise HTTPException(
                        status_code=422,
                        detail=f"answers.{gri_index}.{key_alpha}.polished_text must be a string, got {type(answer.polished_text)}"
                    )
        
        return await controller.save_intake_answers(
            corporation_id=corporation_id,
            answers=payload.answers
        )
    except HTTPException:
        # 이미 HTTPException이면 그대로 전파
        raise
    except Exception as e:
        # 예상치 못한 에러는 로깅하고 500 반환
        import logging
        logging.error(f"Unexpected error in save_intake_answers: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Internal server error occurred while saving intake answers"
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