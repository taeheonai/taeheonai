from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime
import logging

from app.domain.controller.answer_controller import AnswerController
from app.domain.schema.answer_schema import AnswerCreate
from app.common.database import get_db, check_database_connection

logger = logging.getLogger(__name__)

# 동일한 /v1/gri 프리픽스 유지하되 태그만 구분
# GRI 서비스의 답변 관련 라우터
answer_router = APIRouter(prefix="/v1/gri", tags=["answers"])
answer_controller = AnswerController()


@answer_router.post("/answers", summary="GRI 답변 생성")
async def create_answer(payload: AnswerCreate, db: AsyncSession = Depends(get_db)):
    """GRI 답변 생성"""
    try:
        result = await answer_controller.create_answer(payload, db)
        data = result.get("data")
        aid = data.get("id") if isinstance(data, dict) else getattr(data, "id", None)
        logger.info(f"✅ GRI 답변 생성 성공: ID {aid}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ GRI 답변 생성 실패: {e}")
        raise HTTPException(status_code=500, detail=f"GRI 답변 생성 중 오류가 발생했습니다: {str(e)}")


@answer_router.get("/answers/{answer_id}", summary="GRI 답변 조회")
async def get_answer(answer_id: int, db: AsyncSession = Depends(get_db)):
    """GRI 답변 단건 조회"""
    try:
        result = await answer_controller.get_answer_by_id(answer_id, db)
        logger.info(f"✅ GRI 답변 조회 성공: ID {answer_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ GRI 답변 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"GRI 답변 조회 중 오류가 발생했습니다: {str(e)}")


@answer_router.get("/answers", summary="GRI 답변 목록 조회")
async def get_answers(
    db: AsyncSession = Depends(get_db),
    session_key: Optional[str] = None,
    page: int = 1,
    size: int = 10
):
    """GRI 답변 목록 조회"""
    try:
        logger.info(f"📝 GRI 답변 목록 조회 요청: session_key={session_key}, page={page}, size={size}")
        if session_key:
            result = await answer_controller.get_answers_by_session(session_key, page, size, db)
        else:
            result = await answer_controller.get_all_answers(page, size, db)
        logger.info("✅ GRI 답변 목록 조회 성공")
        return result
    except Exception as e:
        logger.error(f"❌ GRI 답변 목록 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"GRI 답변 목록 조회 중 오류가 발생했습니다: {str(e)}")


@answer_router.put("/answers/{answer_id}", summary="GRI 답변 수정")
async def update_answer(answer_id: int, payload: AnswerCreate, db: AsyncSession = Depends(get_db)):
    """GRI 답변 수정"""
    try:
        result = await answer_controller.update_answer(answer_id, payload, db)
        logger.info(f"✅ GRI 답변 수정 성공: ID {answer_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ GRI 답변 수정 실패: {e}")
        raise HTTPException(status_code=500, detail=f"GRI 답변 수정 중 오류가 발생했습니다: {str(e)}")


@answer_router.delete("/answers/{answer_id}", summary="GRI 답변 삭제")
async def delete_answer(answer_id: int, db: AsyncSession = Depends(get_db)):
    """GRI 답변 삭제"""
    try:
        result = await answer_controller.delete_answer(answer_id, db)
        logger.info(f"✅ GRI 답변 삭제 성공: ID {answer_id}")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ GRI 답변 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail=f"GRI 답변 삭제 중 오류가 발생했습니다: {str(e)}")


# ===== 헬스체크 =====

@answer_router.get("/health", include_in_schema=False)
async def health():
    """기본 헬스체크 - DB 연결 없이"""
    return {
        "status": "ok",
        "service": "answer-service",
        "timestamp": datetime.now().isoformat()
    }


@answer_router.get("/health/db", include_in_schema=False)
async def health_db(db: AsyncSession = Depends(get_db)):
    """DB 연결 상태 진단"""
    try:
        result = await db.execute(select(1))
        test_value = result.scalar()
        if test_value == 1:
            return {
                "status": "ok",
                "service": "answer-service",
                "db": "connected",
                "timestamp": datetime.now().isoformat()
            }
        raise HTTPException(status_code=503, detail="DB_QUERY_FAILED")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"DB health check failed: {e}")
        raise HTTPException(status_code=503, detail="DB_UNAVAILABLE")


@answer_router.get("/", summary="답변 서비스 정보")
async def service_info():
    """답변 서비스 정보 및 엔드포인트"""
    return {
        "service": "Answer Service",
        "version": "1.0.0",
        "description": "GRI Answer Management Service",
        "status": "running",
        "endpoints": {
            "answers": {
                "create": "POST /v1/gri/answers",
                "get": "GET /v1/gri/answers/{id}",
                "list": "GET /v1/gri/answers",
                "update": "PUT /v1/gri/answers/{id}",
                "delete": "DELETE /v1/gri/answers/{id}",
                "progress": "GET /v1/gri/progress/{session_key}"
            },
            "health": {
                "check": "GET /v1/gri/health",
                "db": "GET /v1/gri/health/db"
            }
        }
    }


@answer_router.get("/progress/{session_key}", summary="세션별 답변 진행률 조회")
async def get_progress(session_key: str, db: AsyncSession = Depends(get_db)):
    """특정 세션의 답변 진행률 조회"""
    try:
        logger.info(f"📝 진행률 조회 요청: session_key={session_key}")
        from sqlalchemy import func, text, select
        
        total_result = await db.execute(select(func.count()).select_from(text("gri_question")))
        total_questions = total_result.scalar() or 0

        completed_query = text("""
            SELECT COUNT(*) FROM gri_answer
            WHERE session_key = :session_key AND is_completed = TRUE
        """)
        completed_result = await db.execute(completed_query, {"session_key": session_key})
        completed_answers = completed_result.scalar() or 0

        progress_percentage = (completed_answers / total_questions * 100) if total_questions > 0 else 0

        logger.info(f"✅ 진행률 조회 성공: {completed_answers}/{total_questions} ({progress_percentage:.1f}%)")

        return {
            "session_key": session_key,
            "total_questions": total_questions,
            "completed_answers": completed_answers,
            "progress_percentage": round(progress_percentage, 2),
            "source": "gri-service",
        }
    except Exception as e:
        logger.error(f"❌ 진행률 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"진행률 조회 중 오류가 발생했습니다: {str(e)}")
