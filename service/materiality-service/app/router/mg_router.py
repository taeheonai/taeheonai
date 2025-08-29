# app/router/mg_router.py
from typing import List
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.database import get_db
from app.domain.schema.mg_schema import MGResolveRequest, MGIndexMapResponse, MGIndexDTO
from app.domain.controller.mg_controller import MGController
import logging

# 🔧 prefix를 /v1/mg로 수정 (다른 라우터와 일관성)
router = APIRouter(prefix="/v1/mg", tags=["mg"])
logger = logging.getLogger(__name__)

def _controller(db: AsyncSession) -> MGController:
    """MGController 인스턴스 생성 및 반환"""
    return MGController(db)

@router.post("/indexes", response_model=MGIndexMapResponse)
async def resolve_indexes(req: MGResolveRequest, db: AsyncSession = Depends(get_db)):
    """IssuePool ID들에 대한 GRI 인덱스 해결"""
    try:
        controller = _controller(db)
        items = await controller.resolve_indexes(req)
        return MGIndexMapResponse(items=items)
    except Exception as e:
        logger.error(f"MG Index 해결 실패: {e}")
        raise HTTPException(status_code=500, detail=f"MG Index 해결에 실패했습니다: {str(e)}")

@router.post("/polish")
async def polish(
    items: List[MGIndexDTO],
    db: AsyncSession = Depends(get_db),
    x_session_key: str = Header(..., convert_underscores=False),
    x_thread_id: str = Header(..., convert_underscores=False),
):
    """GRI 인덱스에 대한 Polish 요청"""
    try:
        controller = _controller(db)
        return await controller.request_polish(x_session_key, x_thread_id, items)
    except Exception as e:
        logger.error(f"MG Polish 요청 실패: {e}")
        raise HTTPException(status_code=500, detail=f"MG Polish 요청에 실패했습니다: {str(e)}")
