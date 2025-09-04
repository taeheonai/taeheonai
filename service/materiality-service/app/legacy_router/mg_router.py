# app/router/mg_router.py
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Header, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.legacy_database import get_db
from app.domain.legacy_schema.mg_schema import (
    MGResolveRequest,
    MGIndexMapResponse,
    MGIndexDTO,
    # ✅ 신규: 인덱스 단위 윤문 DTO
    MGPolishIndexRequest,
    MGPolishIndexResponse,
    MGIndexResponse,
    MGIndexBlock,
)
from app.domain.legacy_controller.mg_controller import MGController
import logging

router = APIRouter(tags=["mg"])
logger = logging.getLogger(__name__)


def _controller(db: AsyncSession) -> MGController:
    return MGController(db)


# -----------------------------
# 1) /indexes : 원시 바디를 받아 직접 검증/보정 + 상세 로깅
# -----------------------------
@router.post("/indexes", response_model=MGIndexMapResponse)
async def resolve_indexes(
    payload: Dict[str, Any] = Body(...),         # ★ 원시 바디로 받는다 (검증은 우리가)
    db: AsyncSession = Depends(get_db),
):
    # 원시 바디 로깅
    logger.info("[MG] /indexes raw payload=%s", payload)
    logger.info("[MG] /indexes payload type=%s", type(payload))
    logger.info("[MG] /indexes payload keys=%s", list(payload.keys()) if isinstance(payload, dict) else "N/A")

    # 키 두 형태 모두 허용 (issuepool_ids / issuepoolIds)
    ids_src = payload.get("issuepool_ids") or payload.get("issuepoolIds")
    logger.info("[MG] /indexes ids_src=%s, type=%s", ids_src, type(ids_src))
    if not isinstance(ids_src, list):
        raise HTTPException(status_code=422, detail="issuepool_ids must be an array")

    # 정수로 보정 + 공백 제거
    try:
        ids = [int(x) for x in ids_src if str(x).strip() != ""]
    except Exception:
        raise HTTPException(status_code=422, detail="issuepool_ids must contain integers")

    if not ids:
        raise HTTPException(status_code=422, detail="issuepool_ids is empty")
    if len(ids) > 100:
        raise HTTPException(status_code=422, detail="issuepool_ids size must be <= 100")

    logger.info("[MG] /indexes normalized ids=%s", ids)

    # 컨트롤러 호출 (필요 시 스키마로 감싸 전달)
    controller = _controller(db)
    req_model = MGResolveRequest(issuepool_ids=ids)
    items = await controller.resolve_indexes(req_model)

    logger.info("[MG] /indexes OK -> groups=%d", len(items))
    return MGIndexMapResponse(items=items)


# -----------------------------
# 2) /polish : 원시 바디를 받아 스키마로 검증/보정 + 상세 로깅
#    (레거시: MGIndexDTO[] 입력 → 컨트롤러.request_polish 로 위임)
# -----------------------------
@router.post("/polish")
async def polish(
    payload: List[Dict[str, Any]] = Body(...),   # ★ 원시 바디로 받아 직접 검증/로깅
    db: AsyncSession = Depends(get_db),
    x_session_key: str = Header(..., convert_underscores=False),
    x_thread_id: str = Header(..., convert_underscores=False),
):
    logger.info(
        "[MG] /polish raw count=%s, session=%s..., thread=%s...",
        len(payload) if isinstance(payload, list) else "N/A",
        x_session_key[:8],
        x_thread_id[:8],
    )

    if not isinstance(payload, list) or not payload:
        raise HTTPException(status_code=422, detail="items must be a non-empty array")

    # 스키마로 밸리데이션 (여기서 MGIndexDTO는 nest된 gri_indexes를 포함)
    valid_items: List[MGIndexDTO] = []
    for i, obj in enumerate(payload):
        try:
            item = MGIndexDTO.model_validate(obj)
        except Exception as e:
            logger.warning("[MG] /polish item[%d] validation error: %s", i, e)
            raise HTTPException(
                status_code=422,
                detail=f"items[{i}] validation error"
            )
        # 추가 검증
        if not getattr(item, "issuepool_id", None):
            raise HTTPException(status_code=422, detail=f"items[{i}]: issuepool_id missing")
        if not getattr(item, "gri_indexes", None):
            raise HTTPException(status_code=422, detail=f"items[{i}]: gri_indexes missing")

        for j, gi in enumerate(item.gri_indexes):
            if not getattr(gi, "gri_index", None):
                raise HTTPException(status_code=422, detail=f"items[{i}].gri_indexes[{j}]: gri_index missing")
            if not isinstance(getattr(gi, "frequency", None), int):
                raise HTTPException(status_code=422, detail=f"items[{i}].gri_indexes[{j}]: frequency must be int")
            if getattr(gi, "grade", None) not in ["A", "B", "C"]:
                raise HTTPException(status_code=422, detail=f"items[{i}].gri_indexes[{j}]: grade must be A|B|C")

        valid_items.append(item)

    controller = _controller(db)
    result = await controller.request_polish(x_session_key, x_thread_id, valid_items)
    logger.info("[MG] /polish OK (%s)", type(result).__name__)
    return result


# -----------------------------
# 3) /polish/index : 인덱스 단위(a,b,c 묶음) 윤문 (신규)
#    - 프론트에서 하나의 gri_index에 대해 a,b,c 원문들을 함께 보내면
#      컨트롤러.polish_index 가 질문 목록 조회 → LLM 1회 호출 → 통합 윤문 반환
# -----------------------------
@router.post("/polish/index", response_model=MGPolishIndexResponse)
async def polish_index(
    body: MGPolishIndexRequest,
    db: AsyncSession = Depends(get_db),
):
    logger.info(
        "[MG] /polish/index session=%s..., category=%s, index=%s",
        body.session_key[:8],
        body.category_id,
        body.gri_index,
    )
    controller = _controller(db)
    result = await controller.polish_index(body)
    logger.info("[MG] /polish/index OK")
    return result

@router.get("/questions", response_model=MGIndexResponse)
async def list_questions(
    category_id: int,
    db: AsyncSession = Depends(get_db),
):
    controller = _controller(db)
    return await controller.get_questions_by_category(category_id)

@router.get("/questions/index", response_model=MGIndexBlock)
async def get_index_questions(
    category_id: int,
    gri_index: str,
    db: AsyncSession = Depends(get_db),
):
    controller = _controller(db)
    return await controller.get_questions_for_index(category_id, gri_index)

