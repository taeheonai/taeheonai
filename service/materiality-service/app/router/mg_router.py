# app/router/mg_router.py
from typing import List
from fastapi import APIRouter, Depends, Header, HTTPException, Body
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
async def resolve_indexes(req: MGResolveRequest = Body(...), db: AsyncSession = Depends(get_db)):
    """IssuePool ID들에 대한 GRI 인덱스 해결"""
    try:
        # 🔧 BaseModel 검증 및 로깅
        logger.info(f"MG Index 요청 받음: issuepool_ids={req.issuepool_ids}")
        
        # 🔧 Schema 기반 데이터 검증
        if not req.issuepool_ids:
            raise HTTPException(status_code=422, detail="issuepool_ids는 비어있을 수 없습니다")
        
        if len(req.issuepool_ids) > 100:  # 최대 100개 제한
            raise HTTPException(status_code=422, detail="issuepool_ids는 최대 100개까지 가능합니다")
        
        # 🔧 각 ID가 유효한 정수인지 검증
        for i, id_val in enumerate(req.issuepool_ids):
            if not isinstance(id_val, int) or id_val <= 0:
                raise HTTPException(status_code=422, detail=f"issuepool_ids[{i}]: 유효하지 않은 ID 값입니다")
        
        controller = _controller(db)
        items = await controller.resolve_indexes(req)
        
        # 🔧 응답 데이터 로깅
        logger.info(f"MG Index 응답: {len(items)}개 항목 반환")
        
        return MGIndexMapResponse(items=items)
        
    except HTTPException:
        raise  # HTTPException은 그대로 전달
    except Exception as e:
        logger.error(f"MG Index 해결 실패: {e}")
        raise HTTPException(status_code=500, detail=f"MG Index 해결에 실패했습니다: {str(e)}")

@router.post("/polish")
async def polish(
    items: List[MGIndexDTO] = Body(...),
    db: AsyncSession = Depends(get_db),
    x_session_key: str = Header(..., convert_underscores=False),
    x_thread_id: str = Header(..., convert_underscores=False),
):
    """GRI 인덱스에 대한 Polish 요청"""
    try:
        # 🔧 BaseModel 검증 및 로깅
        logger.info(f"MG Polish 요청 받음: session_key={x_session_key[:8]}..., thread_id={x_thread_id[:8]}..., items_count={len(items)}")
        
        # 🔧 Schema 기반 데이터 검증
        if not items:
            raise HTTPException(status_code=422, detail="items는 비어있을 수 없습니다")
        
        # 🔧 각 item의 Schema 필드 검증
        for i, item in enumerate(items):
            # 필수 필드 존재 여부 검증
            if not hasattr(item, 'issuepool_id') or item.issuepool_id is None:
                raise HTTPException(status_code=422, detail=f"item[{i}]: issuepool_id가 누락되었습니다")
            
            if not hasattr(item, 'gri_indexes') or not item.gri_indexes:
                raise HTTPException(status_code=422, detail=f"item[{i}]: gri_indexes가 비어있습니다")
            
            # gri_indexes 배열의 각 항목 검증
            for j, gri in enumerate(item.gri_indexes):
                if not hasattr(gri, 'gri_index') or not gri.gri_index:
                    raise HTTPException(status_code=422, detail=f"item[{i}].gri_indexes[{j}]: gri_index가 누락되었습니다")
                
                if not hasattr(gri, 'frequency') or not isinstance(gri.frequency, int):
                    raise HTTPException(status_code=422, detail=f"item[{i}].gri_indexes[{j}]: frequency가 유효하지 않습니다")
                
                if not hasattr(gri, 'grade') or gri.grade not in ['A', 'B', 'C']:
                    raise HTTPException(status_code=422, detail=f"item[{i}].gri_indexes[{j}]: grade가 유효하지 않습니다")
        
        controller = _controller(db)
        result = await controller.request_polish(x_session_key, x_thread_id, items)
        
        # 🔧 응답 로깅
        logger.info(f"MG Polish 응답: {type(result).__name__}")
        
        return result
        
    except HTTPException:
        raise  # HTTPException은 그대로 전달
    except Exception as e:
        logger.error(f"MG Polish 요청 실패: {e}")
        raise HTTPException(status_code=500, detail=f"MG Polish 요청에 실패했습니다: {str(e)}")
