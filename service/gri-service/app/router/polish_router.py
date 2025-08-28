from fastapi import APIRouter, HTTPException
import logging

from app.domain.controller.polish_controller import PolishController
from app.domain.schema.polish_schema import PolishRequest

logger = logging.getLogger(__name__)

# GRI 서비스의 윤문 관련 라우터
polish_router = APIRouter(prefix="/v1/gri", tags=["polish"])
polish_controller = PolishController()


@polish_router.post("/polish", summary="GRI 답변 윤문")
async def polish_answers(request: PolishRequest):
    """GRI 답변 윤문 처리"""
    try:
        logger.info(f"📝 GRI 답변 윤문 요청: gri_index={request.gri_index}")
        
        result = await polish_controller.polish_answers(request)
        logger.info(f"✅ GRI 답변 윤문 성공: {len(request.answers)}개 답변")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ GRI 답변 윤문 실패: {e}")
        raise HTTPException(status_code=500, detail=f"GRI 답변 윤문 중 오류가 발생했습니다: {str(e)}")


@polish_router.get("/polish/{session_key}/{gri_index}", summary="윤문 결과 조회")
async def get_polish_result(session_key: str, gri_index: str):
    """세션과 GRI 인덱스로 윤문 결과 조회"""
    try:
        logger.info(f"📝 윤문 결과 조회 요청: session_key={session_key}, gri_index={gri_index}")
        
        result = await polish_controller.get_polish_result(session_key, gri_index)
        if not result:
            raise HTTPException(status_code=404, detail="윤문 결과를 찾을 수 없습니다")
            
        logger.info(f"✅ 윤문 결과 조회 성공")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 윤문 결과 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"윤문 결과 조회 중 오류가 발생했습니다: {str(e)}")


@polish_router.get("/polish/{session_key}", summary="세션별 윤문 결과 목록")
async def list_polish_results(session_key: str):
    """세션별 윤문 결과 목록 조회"""
    try:
        logger.info(f"📝 세션별 윤문 결과 목록 조회 요청: session_key={session_key}")
        
        results = await polish_controller.list_polish_results(session_key)
        logger.info(f"✅ 윤문 결과 목록 조회 성공: {len(results)}개")
        
        return {
            "status": "success",
            "data": results,
            "count": len(results)
        }
        
    except Exception as e:
        logger.error(f"❌ 윤문 결과 목록 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"윤문 결과 목록 조회 중 오류가 발생했습니다: {str(e)}")


@polish_router.delete("/polish/{session_key}", summary="세션의 윤문 결과 삭제")
async def clear_polish_results(session_key: str):
    """세션의 모든 윤문 결과 삭제"""
    try:
        logger.info(f"📝 세션 윤문 결과 삭제 요청: session_key={session_key}")
        
        success = await polish_controller.clear_polish_results(session_key)
        if success:
            logger.info(f"✅ 세션 윤문 결과 삭제 성공")
            return {"status": "success", "message": "윤문 결과가 삭제되었습니다"}
        else:
            return {"status": "success", "message": "삭제할 윤문 결과가 없습니다"}
        
    except Exception as e:
        logger.error(f"❌ 세션 윤문 결과 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail=f"윤문 결과 삭제 중 오류가 발생했습니다: {str(e)}")


# ===== 헬스체크 =====

@polish_router.get("/health", include_in_schema=False)
async def health():
    """기본 헬스체크"""
    return {
        "status": "ok",
        "service": "polish-service",
        "timestamp": datetime.now().isoformat()
    }


@polish_router.get("/", summary="윤문 서비스 정보")
async def service_info():
    """윤문 서비스 정보 및 엔드포인트"""
    return {
        "service": "Polish Service",
        "version": "1.0.0",
        "description": "GRI Answer Polish Service",
        "status": "running",
        "endpoints": {
            "polish": {
                "create": "POST /v1/gri/polish",
                "get": "GET /v1/gri/polish/{session_key}/{gri_index}",
                "list": "GET /v1/gri/polish/{session_key}",
                "clear": "DELETE /v1/gri/polish/{session_key}"
            },
            "health": {
                "check": "GET /v1/gri/health"
            }
        }
    }
