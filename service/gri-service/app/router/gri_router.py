from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
from datetime import datetime
import logging
import json

from app.domain.controller.answer_controller import AnswerController
from app.domain.schema.answer_schema import AnswerCreate

logger = logging.getLogger(__name__)

# GRI 메인 라우터 생성
gri_router = APIRouter(prefix="/v1/gri", tags=["gri"])

# AnswerController 인스턴스 생성
answer_controller = AnswerController()

# JSON 요청 검증 및 변환 함수
def validate_and_convert_json(request_data: Dict[str, Any], model_class) -> Any:
    """JSON 데이터를 Pydantic 모델로 검증하고 변환합니다."""
    try:
        # Pydantic 모델로 변환 및 검증
        validated_data = model_class(**request_data)
        logger.info(f"✅ JSON 데이터 검증 성공: {model_class.__name__}")
        return validated_data
    except Exception as e:
        logger.error(f"❌ JSON 데이터 검증 실패: {e}")
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid data format: {str(e)}"
        )

# GRI 답변 관리 엔드포인트들
@gri_router.post("/answers", summary="GRI 답변 생성")
async def create_answer(request: Request):
    """GRI 답변 생성 요청을 처리합니다."""
    try:
        # JSON 요청 본문 파싱
        body = await request.body()
        request_data = json.loads(body.decode('utf-8'))
        
        logger.info(f"📝 GRI 답변 생성 요청: {request_data}")
        
        # JSON 데이터를 AnswerCreate 모델로 변환
        answer_data = validate_and_convert_json(request_data, AnswerCreate)
        
        # AnswerController를 통해 서비스 호출
        from app.common.database import get_db
        
        # 의존성 주입을 위한 임시 처리
        db = await get_db().__anext__()
        
        result = await answer_controller.create_answer(answer_data, db)
        
        logger.info(f"✅ GRI 답변 생성 성공")
        
        return JSONResponse(
            status_code=201,
            content={
                **result,
                "source": "frontend"
            }
        )
        
    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        logger.error(f"❌ JSON 파싱 오류: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"❌ GRI 답변 생성 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"GRI 답변 생성 중 오류가 발생했습니다: {str(e)}"
        )

@gri_router.get("/answers/{answer_id}", summary="GRI 답변 조회")
async def get_answer(answer_id: int, request: Request):
    """GRI 답변 조회 요청을 처리합니다."""
    try:
        logger.info(f"📝 GRI 답변 조회 요청: ID {answer_id}")
        
        # AnswerController를 통해 서비스 호출
        from app.common.database import get_db
        
        # 의존성 주입을 위한 임시 처리
        db = await get_db().__anext__()
        
        result = await answer_controller.get_answer_by_id(answer_id, db)
        
        logger.info(f"✅ GRI 답변 조회 성공: ID {answer_id}")
        
        return JSONResponse(
            status_code=200,
            content={
                **result,
                "source": "frontend"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ GRI 답변 조회 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"GRI 답변 조회 중 오류가 발생했습니다: {str(e)}"
        )

@gri_router.get("/answers", summary="GRI 답변 목록 조회")
async def get_answers(
    request: Request,
    company_id: Optional[str] = None,
    page: int = 1,
    size: int = 10
):
    """GRI 답변 목록 조회 요청을 처리합니다."""
    try:
        logger.info(f"📝 GRI 답변 목록 조회 요청: company_id={company_id}, page={page}, size={size}")
        
        # AnswerController를 통해 서비스 호출
        from app.common.database import get_db
        
        # 의존성 주입을 위한 임시 처리
        db = await get_db().__anext__()
        
        if company_id:
            result = await answer_controller.get_answers_by_company(company_id, page, size, db)
        else:
            result = await answer_controller.get_all_answers(page, size, db)
        
        logger.info(f"✅ GRI 답변 목록 조회 성공")
        
        return JSONResponse(
            status_code=200,
            content={
                **result,
                "source": "frontend"
            }
        )
        
    except Exception as e:
        logger.error(f"❌ GRI 답변 목록 조회 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"GRI 답변 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )

@gri_router.put("/answers/{answer_id}", summary="GRI 답변 수정")
async def update_answer(answer_id: int, request: Request):
    """GRI 답변 수정 요청을 처리합니다."""
    try:
        # JSON 요청 본문 파싱
        body = await request.body()
        request_data = json.loads(body.decode('utf-8'))
        
        logger.info(f"📝 GRI 답변 수정 요청: ID {answer_id}, 데이터: {request_data}")
        
        # JSON 데이터를 AnswerCreate 모델로 변환
        answer_data = validate_and_convert_json(request_data, AnswerCreate)
        
        # AnswerController를 통해 서비스 호출
        from app.common.database import get_db
        
        # 의존성 주입을 위한 임시 처리
        db = await get_db().__anext__()
        
        result = await answer_controller.update_answer(answer_id, answer_data, db)
        
        logger.info(f"✅ GRI 답변 수정 성공: ID {answer_id}")
        
        return JSONResponse(
            status_code=200,
            content={
                **result,
                "source": "frontend"
            }
        )
        
    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        logger.error(f"❌ JSON 파싱 오류: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        logger.error(f"❌ GRI 답변 수정 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"GRI 답변 수정 중 오류가 발생했습니다: {str(e)}"
        )

@gri_router.delete("/answers/{answer_id}", summary="GRI 답변 삭제")
async def delete_answer(answer_id: int, request: Request):
    """GRI 답변 삭제 요청을 처리합니다."""
    try:
        logger.info(f"📝 GRI 답변 삭제 요청: ID {answer_id}")
        
        # AnswerController를 통해 서비스 호출
        from app.common.database import get_db
        
        # 의존성 주입을 위한 임시 처리
        db = await get_db().__anext__()
        
        result = await answer_controller.delete_answer(answer_id, db)
        
        logger.info(f"✅ GRI 답변 삭제 성공: ID {answer_id}")
        
        return JSONResponse(
            status_code=200,
            content={
                **result,
                "source": "frontend"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ GRI 답변 삭제 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"GRI 답변 삭제 중 오류가 발생했습니다: {str(e)}"
        )



# 데이터베이스 상태 확인 엔드포인트
@gri_router.get("/db-status")
async def database_status_check():
    """데이터베이스 상태 확인 엔드포인트"""
    try:
        from app.common.database import check_database_connection
        connection_ok = await check_database_connection()
        return {
            "status": "success" if connection_ok else "failed",
            "service": "gri-service",
            "database": "Railway PostgreSQL",
            "connection": "connected" if connection_ok else "disconnected",
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        logger.error(f"Database status check failed: {e}")
        return {
            "status": "error",
            "service": "gri-service",
            "database": "Railway PostgreSQL",
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
        }

# 헬스체크
@gri_router.get("/health", summary="헬스체크")
async def health_check():
    """헬스체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "gri-service",
        "database": "Railway PostgreSQL",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
    }

# 메인 GRI 서비스 정보
@gri_router.get("/", summary="GRI 서비스 정보")
async def gri_service_info():
    """GRI 서비스 정보 및 엔드포인트 안내"""
    return {
        "service": "GRI Service",
        "version": "1.0.0",
        "description": "GRI Standards Service for TaeheonAI",
        "endpoints": {
            "create_answer": "POST /v1/gri/answers",
            "get_answer": "GET /v1/gri/answers/{id}",
            "get_answers": "GET /v1/gri/answers",
            "update_answer": "PUT /v1/gri/answers/{id}",
            "delete_answer": "DELETE /v1/gri/answers/{id}",
            "health": "GET /v1/gri/health"
        }
    }
