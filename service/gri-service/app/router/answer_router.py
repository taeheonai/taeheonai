from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, text
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


@answer_router.get("/categories", summary="GRI 카테고리 목록 조회")
async def get_categories(db: AsyncSession = Depends(get_db)):
    """모든 GRI 카테고리 조회"""
    try:
        logger.info("📝 GRI 카테고리 목록 조회 요청")

        query = text("""
            SELECT id, code, title, display_order
            FROM gri_category
            ORDER BY display_order, id
        """)
        result = await db.execute(query)
        categories = [dict(row) for row in result.mappings().all()]

        logger.info(f"✅ GRI 카테고리 조회 성공: {len(categories)}개")

        return {
            "categories": categories,
            "count": len(categories),
            "source": "gri-service",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ GRI 카테고리 조회 실패: {e}")
        if "does not exist" in str(e) or "relation" in str(e):
            raise HTTPException(status_code=503, detail="DB_TABLE_NOT_FOUND")
        elif "connection" in str(e).lower():
            raise HTTPException(status_code=503, detail="DB_CONNECTION_FAILED")
        else:
            raise HTTPException(status_code=500, detail="CATEGORY_FETCH_FAILED")


@answer_router.get("/categories/{category_id}/items", summary="카테고리별 GRI Index 목록 조회")
async def get_category_items(category_id: int, db: AsyncSession = Depends(get_db)):
    """특정 카테고리의 GRI Index 목록 조회"""
    try:
        logger.info(f"📝 GRI Index 목록 조회 요청: category_id={category_id}")

        query = text("""
            SELECT id, index_no, title, display_order
            FROM gri_item
            WHERE category_id = :category_id
            ORDER BY display_order, index_no
        """)
        result = await db.execute(query, {"category_id": category_id})
        items = [dict(row) for row in result.mappings().all()]

        logger.info(f"✅ GRI Index 조회 성공: {len(items)}개")

        return {
            "category_id": category_id,
            "items": items,
            "count": len(items),
            "source": "gri-service",
        }

    except Exception as e:
        logger.error(f"❌ GRI Index 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"아이템 조회 중 오류가 발생했습니다: {str(e)}")


@answer_router.get("/items/{item_id}/questions", summary="GRI Index별 질문 목록 조회")
async def get_item_questions(item_id: int, db: AsyncSession = Depends(get_db)):
    """특정 GRI Index의 질문 목록 조회"""
    try:
        logger.info(f"📝 GRI 질문 목록 조회 요청: item_id={item_id}")

        query = text("""
            SELECT id, key_alpha, question_text, reference_text, question_type, display_order, required
            FROM gri_question
            WHERE item_id = :item_id
            ORDER BY display_order, key_alpha
        """)
        result = await db.execute(query, {"item_id": item_id})
        questions = [dict(row) for row in result.mappings().all()]

        logger.info(f"✅ GRI 질문 조회 성공: {len(questions)}개")

        return {
            "item_id": item_id,
            "questions": questions,
            "count": len(questions),
            "source": "gri-service",
        }

    except Exception as e:
        logger.error(f"❌ GRI 질문 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"질문 조회 중 오류가 발생했습니다: {str(e)}")


@answer_router.get("/complete/{category_id}", summary="카테고리별 완전한 GRI 데이터 조회")
async def get_complete_gri_data(category_id: int, db: AsyncSession = Depends(get_db)):
    """카테고리별 완전한 GRI 데이터 (카테고리 + 아이템 + 질문)"""
    try:
        logger.info(f"📝 완전한 GRI 데이터 조회 요청: category_id={category_id}")

        category_query = text("""
            SELECT id, code, title
            FROM gri_category
            WHERE id = :category_id
        """)
        category_result = await db.execute(category_query, {"category_id": category_id})
        category_row = category_result.mappings().first()
        if not category_row:
            raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다")

        category = dict(category_row)

        items_query = text("""
            SELECT 
                i.id as item_id,
                i.index_no,
                i.title as item_title,
                q.id as question_id,
                q.key_alpha,
                q.question_text,
                q.reference_text,
                q.question_type,
                q.required
            FROM gri_item i
            LEFT JOIN gri_question q ON i.id = q.item_id
            WHERE i.category_id = :category_id
            ORDER BY i.display_order, i.index_no, q.display_order, q.key_alpha
        """)
        items_result = await db.execute(items_query, {"category_id": category_id})

        items = []
        current_item = None

        for row in items_result.mappings().all():
            row_dict = dict(row)

            if current_item is None or current_item["id"] != row_dict["item_id"]:
                current_item = {
                    "id": row_dict["item_id"],
                    "index_no": row_dict["index_no"],
                    "title": row_dict["item_title"],
                    "questions": []
                }
                items.append(current_item)

            if row_dict["question_id"]:
                question = {
                    "id": row_dict["question_id"],
                    "key_alpha": row_dict["key_alpha"],
                    "question_text": row_dict["question_text"],
                    "reference_text": row_dict["reference_text"],
                    "question_type": row_dict["question_type"],
                    "required": row_dict["required"]
                }
                current_item["questions"].append(question)

        logger.info(f"✅ 완전한 GRI 데이터 조회 성공: {len(items)}개 아이템")

        return {
            "category": category,
            "items": items,
            "item_count": len(items),
            "source": "gri-service",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 완전한 GRI 데이터 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"데이터 조회 중 오류가 발생했습니다: {str(e)}")


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
