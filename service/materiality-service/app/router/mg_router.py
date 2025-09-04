"""
MG (Materiality GRI) Router - FastAPI 라우터
"""
from fastapi import APIRouter, HTTPException, Request, Header, Query, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
import logging

# 로거 설정
logger = logging.getLogger(__name__)

# 의존성 주입을 위한 임시 구현
from app.domain.mg.schema import (
    MGIndexesRequest, MGIndexesResponse,
    MGCategoryIndexesRequest, MGCategoryIndexesResponse,
    MGQuestionsRequest, MGIndexResponse,
    MGIndexQuestionsRequest, MGIndexBlock,
    PolishIndexPayload, PolishIndexResponse,
    MGIndexDTO
)
from app.domain.mg.controller import MGController
from app.domain.mg.service import MGService
from app.domain.mg.repository import MGRepository
from app.common.database.issuepool_db import get_db

# 임시 데이터베이스 세션 (실제로는 의존성 주입 사용)
class MockDBSession:
    pass

# 라우터 생성
mg_router = APIRouter(prefix="/mg", tags=["MG"])

# 의존성 주입 함수들
def get_mg_repository():
    """MG 리포지토리 의존성 주입"""
    return MGRepository(MockDBSession())

def get_mg_service():
    """MG 서비스 의존성 주입"""
    repository = get_mg_repository()
    return MGService(repository)

def get_mg_controller():
    """MG 컨트롤러 의존성 주입"""
    service = get_mg_service()
    return MGController(service)

@mg_router.post("/indexes", summary="MG 인덱스 조회")
async def get_mg_indexes(request: MGIndexesRequest, db: AsyncSession = Depends(get_db)):
    """
    이슈풀 ID들로 MG 인덱스 조회 (기존 프로젝트 MG 기능 사용)
    
    Args:
        request: MGIndexesRequest
            - issuepool_ids: 이슈풀 ID 목록
        db: 데이터베이스 세션
    
    Returns:
        MGIndexesResponse: MG 인덱스 목록
    """
    logger.info("📊 MG 인덱스 조회 POST 요청 받음")
    try:
        logger.info(f"MG 인덱스 조회 시도: {len(request.issuepool_ids)}개 ID")
        
        # 기존 프로젝트의 MG 컨트롤러 사용
        from app.domain.legacy_controller.mg_controller import MGController
        controller = MGController(db)
        result = await controller.resolve_indexes_by_ids(request.issuepool_ids)
        
        # MGIndexesResponse 형태로 변환
        from app.domain.mg.schema import MGIndexesResponse
        response = MGIndexesResponse(items=result)
        
        logger.info(f"✅ MG 인덱스 조회 완료: {len(result)}개 항목")
        return response
        
    except Exception as e:
        logger.error(f"❌ MG 인덱스 조회 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"MG 인덱스 조회 중 오류가 발생했습니다: {str(e)}")

@mg_router.post("/category-indexes", summary="카테고리 기반 MG 인덱스 조회")
async def get_mg_category_indexes(request: MGCategoryIndexesRequest, db: AsyncSession = Depends(get_db)):
    """카테고리 ID 리스트로 GRI 인덱스 조회"""
    logger.info("📊 카테고리 기반 MG 인덱스 조회 POST 요청 받음")
    try:
        logger.info(f"카테고리 기반 MG 인덱스 조회 시도: {len(request.category_ids)}개 카테고리 ID")
        
        # 기존 프로젝트의 MG 컨트롤러 사용
        from app.domain.legacy_controller.mg_controller import MGController
        controller = MGController(db)
        
        # 카테고리 ID 리스트로 실제 issuepool 데이터와 GRI 인덱스 조회
        result = []
        for category_id in request.category_ids:
            # 실제 issuepool 테이블에서 해당 category_id의 데이터 조회
            category_data = await controller.get_issuepool_by_category_id(category_id)
            if category_data:
                result.append(category_data)
        
        # MGCategoryIndexesResponse 형태로 변환
        response = MGCategoryIndexesResponse(items=result)
        
        logger.info(f"✅ 카테고리 기반 MG 인덱스 조회 완료: {len(result)}개 카테고리")
        return response
        
    except Exception as e:
        logger.error(f"❌ 카테고리 기반 MG 인덱스 조회 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"카테고리 기반 MG 인덱스 조회 중 오류가 발생했습니다: {str(e)}")

@mg_router.get("/questions", summary="카테고리별 질문 조회")
async def get_questions_by_category(category_id: int = Query(..., description="카테고리 ID")):
    """
    카테고리별 질문 조회
    
    Args:
        category_id: 카테고리 ID
    
    Returns:
        MGIndexResponse: 카테고리별 질문 목록
    """
    logger.info(f"📋 카테고리별 질문 조회 GET 요청 받음: category_id={category_id}")
    try:
        request = MGQuestionsRequest(category_id=category_id)
        
        # 컨트롤러를 통해 서비스 호출
        controller = get_mg_controller()
        result = await controller.get_questions_by_category(request)
        
        logger.info(f"✅ 카테고리별 질문 조회 완료: {len(result.indexes)}개 블록")
        return result
        
    except Exception as e:
        logger.error(f"❌ 카테고리별 질문 조회 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"카테고리별 질문 조회 중 오류가 발생했습니다: {str(e)}")

@mg_router.get("/questions/index", summary="특정 인덱스 질문 조회")
async def get_index_questions(
    category_id: int = Query(..., description="카테고리 ID"),
    gri_index: str = Query(..., description="GRI 인덱스")
):
    """
    특정 인덱스의 질문 조회
    
    Args:
        category_id: 카테고리 ID
        gri_index: GRI 인덱스
    
    Returns:
        MGIndexBlock: 인덱스별 질문 블록
    """
    logger.info(f"📋 인덱스 질문 조회 GET 요청 받음: category_id={category_id}, gri_index={gri_index}")
    try:
        request = MGIndexQuestionsRequest(category_id=category_id, gri_index=gri_index)
        
        # 컨트롤러를 통해 서비스 호출
        controller = get_mg_controller()
        result = await controller.get_index_questions(request)
        
        logger.info(f"✅ 인덱스 질문 조회 완료: {gri_index}")
        return result
        
    except Exception as e:
        logger.error(f"❌ 인덱스 질문 조회 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"인덱스 질문 조회 중 오류가 발생했습니다: {str(e)}")

@mg_router.post("/polish", summary="레거시 윤문")
async def polish_legacy(
    items: List[MGIndexDTO],
    x_session_key: str = Header(..., alias="X-Session-Key"),
    x_thread_id: str = Header(..., alias="X-Thread-Id")
):
    """
    레거시 윤문 (기존 호환성 유지)
    
    Args:
        items: MG 인덱스 목록
        x_session_key: 세션 키
        x_thread_id: 스레드 ID
    
    Returns:
        dict: 윤문 결과
    """
    logger.info(f"✨ 레거시 윤문 POST 요청 받음: {len(items)}개 항목")
    try:
        # 컨트롤러를 통해 서비스 호출
        controller = get_mg_controller()
        result = await controller.polish_legacy(x_session_key, x_thread_id, items)
        
        logger.info(f"✅ 레거시 윤문 완료: {len(items)}개 항목")
        return result
        
    except Exception as e:
        logger.error(f"❌ 레거시 윤문 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"윤문 중 오류가 발생했습니다: {str(e)}")

@mg_router.post("/polish/index", summary="인덱스 단위 윤문")
async def polish_index(payload: PolishIndexPayload):
    """
    인덱스 단위 윤문
    
    Args:
        payload: 윤문 요청 데이터
    
    Returns:
        PolishIndexResponse: 윤문 결과
    """
    logger.info(f"✨ 인덱스 윤문 POST 요청 받음: {payload.gri_index}")
    try:
        # 컨트롤러를 통해 서비스 호출
        controller = get_mg_controller()
        result = await controller.polish_index(payload)
        
        logger.info(f"✅ 인덱스 윤문 완료: {payload.gri_index}")
        return result
        
    except Exception as e:
        logger.error(f"❌ 인덱스 윤문 중 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"윤문 중 오류가 발생했습니다: {str(e)}")
