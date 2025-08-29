# app/router/mg_router.py
from typing import List
from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.common.database import get_db
from app.domain.schema.mg_schema import MGResolveRequest, MGIndexMapResponse, MGIndexDTO
from app.domain.repository.mg_repository import MGRepository
from app.domain.service.mg_service import MGService

# 🔧 prefix를 /v1/mg로 수정 (다른 라우터와 일관성)
router = APIRouter(prefix="/v1/mg", tags=["mg"])

def _svc(db: AsyncSession) -> MGService:
    return MGService(MGRepository(db))

@router.post("/indexes", response_model=MGIndexMapResponse)
async def resolve_indexes(req: MGResolveRequest, db: AsyncSession = Depends(get_db)):
    svc = _svc(db)
    items = await svc.resolve_indexes(req.issuepool_ids)
    return MGIndexMapResponse(items=items)

@router.post("/polish")
async def polish(
    items: List[MGIndexDTO],
    db: AsyncSession = Depends(get_db),
    x_session_key: str = Header(..., convert_underscores=False),
    x_thread_id: str = Header(..., convert_underscores=False),
):
    svc = _svc(db)
    return await svc.request_polish(x_session_key, x_thread_id, items)
