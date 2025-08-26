from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging
import json

from app.domain.controller.answer_controller import AnswerController
from app.domain.schema.answer_schema import AnswerCreate
from app.common.database import get_db
from app.domain.schema.answer_schema import AnswerResponse

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

# ===== GRI 데이터 조회 엔드포인트들 =====

@gri_router.get("/categories", summary="GRI 카테고리 목록 조회")
async def get_categories(db: AsyncSession = Depends(get_db)):
    """모든 GRI 카테고리 조회"""
    try:
        logger.info("📝 GRI 카테고리 목록 조회 요청")
        
        # 카테고리 조회 쿼리 - SQLAlchemy 2.0 text() 사용
        query = text("""
            SELECT id, code, title, display_order
            FROM gri_category
            ORDER BY display_order, id
        """)
        
        result = await db.execute(query)
        categories = [dict(row) for row in result.mappings().all()]
        
        logger.info(f"✅ GRI 카테고리 조회 성공: {len(categories)}개")
        
        # jsonable_encoder로 안전한 직렬화
        return jsonable_encoder({
            "categories": categories,
            "count": len(categories),
            "source": "gri-service"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ GRI 카테고리 조회 실패: {e}")
        # 구체적인 오류 타입에 따른 적절한 응답
        if "does not exist" in str(e) or "relation" in str(e):
            raise HTTPException(status_code=503, detail="DB_TABLE_NOT_FOUND")
        elif "connection" in str(e).lower():
            raise HTTPException(status_code=503, detail="DB_CONNECTION_FAILED")
        else:
            raise HTTPException(status_code=500, detail="CATEGORY_FETCH_FAILED")

@gri_router.get("/categories/{category_id}/items", summary="카테고리별 GRI Index 목록 조회")
async def get_category_items(category_id: int, db: AsyncSession = Depends(get_db)):
    """특정 카테고리의 GRI Index 목록 조회"""
    try:
        logger.info(f"📝 GRI Index 목록 조회 요청: category_id={category_id}")
        
        # 아이템 조회 쿼리 - SQLAlchemy 2.0 text() 사용
        query = text("""
            SELECT id, index_no, title, display_order
            FROM gri_item
            WHERE category_id = :category_id
            ORDER BY display_order, index_no
        """)
        
        result = await db.execute(query, {"category_id": category_id})
        items = [dict(row) for row in result.mappings().all()]
        
        logger.info(f"✅ GRI Index 조회 성공: {len(items)}개")
        
        return JSONResponse(
            status_code=200,
            content={
                "category_id": category_id,
                "items": items,
                "count": len(items),
                "source": "gri-service"
            }
        )
        
    except Exception as e:
        logger.error(f"❌ GRI Index 조회 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"아이템 조회 중 오류가 발생했습니다: {str(e)}"
        )

@gri_router.get("/items/{item_id}/questions", summary="GRI Index별 질문 목록 조회")
async def get_item_questions(item_id: int, db: AsyncSession = Depends(get_db)):
    """특정 GRI Index의 질문 목록 조회"""
    try:
        logger.info(f"📝 GRI 질문 목록 조회 요청: item_id={item_id}")
        
        # 질문 조회 쿼리 - SQLAlchemy 2.0 text() 사용
        query = text("""
            SELECT id, key_alpha, question_text, reference_text, question_type, display_order, required
            FROM gri_question
            WHERE item_id = :item_id
            ORDER BY display_order, key_alpha
        """)
        
        result = await db.execute(query, {"item_id": item_id})
        questions = [dict(row) for row in result.mappings().all()]
        
        logger.info(f"✅ GRI 질문 조회 성공: {len(questions)}개")
        
        return JSONResponse(
            status_code=200,
            content={
                "item_id": item_id,
                "questions": questions,
                "count": len(questions),
                "source": "gri-service"
            }
        )
        
    except Exception as e:
        logger.error(f"❌ GRI 질문 조회 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"질문 조회 중 오류가 발생했습니다: {str(e)}"
        )

@gri_router.get("/complete/{category_id}", summary="카테고리별 완전한 GRI 데이터 조회")
async def get_complete_gri_data(category_id: int, db: AsyncSession = Depends(get_db)):
    """카테고리별 완전한 GRI 데이터 조회 (카테고리 + 아이템 + 질문)"""
    try:
        logger.info(f"📝 완전한 GRI 데이터 조회 요청: category_id={category_id}")
        
        # 카테고리 정보 조회 - SQLAlchemy 2.0 text() 사용
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
        
        # 아이템 및 질문 정보 조회 - SQLAlchemy 2.0 text() 사용
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
        
        # 데이터 구조화
        items = []
        current_item = None
        
        for row in items_result.mappings().all():
            row_dict = dict(row)
            
            if current_item is None or current_item["id"] != row_dict["item_id"]:
                # 새 아이템 시작
                current_item = {
                    "id": row_dict["item_id"],
                    "index_no": row_dict["index_no"],
                    "title": row_dict["item_title"],
                    "questions": []
                }
                items.append(current_item)
            
            # 질문 추가
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
        
        return JSONResponse(
            status_code=200,
            content={
                "category": category,
                "items": items,
                "item_count": len(items),
                "source": "gri-service"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 완전한 GRI 데이터 조회 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"데이터 조회 중 오류가 발생했습니다: {str(e)}"
        )

@gri_router.get("/progress/{session_key}", summary="세션별 답변 진행률 조회")
async def get_progress(session_key: str, db: AsyncSession = Depends(get_db)):
    """특정 세션의 답변 진행률 조회"""
    try:
        logger.info(f"📝 진행률 조회 요청: session_key={session_key}")
        
        # 전체 질문 수
        from sqlalchemy import func
        total_result = await db.execute(select(func.count()).select_from(text("gri_question")))
        total_questions = total_result.scalar() or 0
        
        # 답변 완료된 질문 수 - SQLAlchemy 2.0 text() 사용
        completed_query = text("""
            SELECT COUNT(*) FROM gri_answer
            WHERE session_key = :session_key AND is_completed = TRUE
        """)
        completed_result = await db.execute(completed_query, {"session_key": session_key})
        completed_answers = completed_result.scalar() or 0
        
        progress_percentage = (completed_answers / total_questions * 100) if total_questions > 0 else 0
        
        logger.info(f"✅ 진행률 조회 성공: {completed_answers}/{total_questions} ({progress_percentage:.1f}%)")
        
        return JSONResponse(
            status_code=200,
            content={
                "session_key": session_key,
                "total_questions": total_questions,
                "completed_answers": completed_answers,
                "progress_percentage": round(progress_percentage, 2),
                "source": "gri-service"
            }
        )
        
    except Exception as e:
        logger.error(f"❌ 진행률 조회 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"진행률 조회 중 오류가 발생했습니다: {str(e)}"
        )

# ===== 기존 GRI 답변 관리 엔드포인트들 =====

# GRI 답변 관리 엔드포인트들
@gri_router.post("/answers", summary="GRI 답변 생성")
async def create_answer(request: Request, db: AsyncSession = Depends(get_db)):
    """GRI 답변 생성 요청을 처리합니다."""
    try:
        # JSON 요청 본문 파싱
        body = await request.body()
        request_data = json.loads(body.decode('utf-8'))
        
        logger.info(f"📝 GRI 답변 생성 요청: {jsonable_encoder(request_data)}")
        
        # JSON 데이터를 AnswerCreate 모델로 변환
        answer_data = validate_and_convert_json(request_data, AnswerCreate)
        
        # AnswerController를 통해 서비스 호출
        result = await answer_controller.create_answer(answer_data, db)
        
        logger.info(f"✅ GRI 답변 생성 성공: ID {result.get('data', {}).get('id', 'N/A')}")
        
        # wrapper 구조 그대로 반환 (FastAPI가 자동으로 JSON 직렬화)
        return result
        
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
async def get_answer(answer_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """GRI 답변 조회 요청을 처리합니다."""
    try:
        logger.info(f"📝 GRI 답변 조회 요청: ID {answer_id}")
        
        # AnswerController를 통해 서비스 호출
        result = await answer_controller.get_answer_by_id(answer_id, db)
        
        logger.info(f"✅ GRI 답변 조회 성공: ID {answer_id}")
        
        # wrapper 구조 그대로 반환 (FastAPI가 자동으로 JSON 직렬화)
        return result
        
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
    db: AsyncSession = Depends(get_db),
    session_key: Optional[str] = None,
    page: int = 1,
    size: int = 10
):
    """GRI 답변 목록 조회 요청을 처리합니다."""
    try:
        logger.info(f"📝 GRI 답변 목록 조회 요청: session_key={session_key}, page={page}, size={size}")
        
        # AnswerController를 통해 서비스 호출
        if session_key:
            result = await answer_controller.get_answers_by_session(session_key, page, size, db)
        else:
            result = await answer_controller.get_all_answers(page, size, db)
        
        logger.info(f"✅ GRI 답변 목록 조회 성공")
        
        # FastAPI가 자동으로 Pydantic 모델을 JSON으로 직렬화
        return result
        
    except Exception as e:
        logger.error(f"❌ GRI 답변 목록 조회 실패: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"GRI 답변 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )

@gri_router.put("/answers/{answer_id}", summary="GRI 답변 수정")
async def update_answer(answer_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """GRI 답변 수정 요청을 처리합니다."""
    try:
        # JSON 요청 본문 파싱
        body = await request.body()
        request_data = json.loads(body.decode('utf-8'))
        
        logger.info(f"📝 GRI 답변 수정 요청: ID {answer_id}, 데이터: {jsonable_encoder(request_data)}")
        
        # JSON 데이터를 AnswerCreate 모델로 변환
        answer_data = validate_and_convert_json(request_data, AnswerCreate)
        
        # AnswerController를 통해 서비스 호출
        result = await answer_controller.update_answer(answer_id, answer_data, db)
        
        logger.info(f"✅ GRI 답변 수정 성공: ID {answer_id}")
        
        # wrapper 구조 그대로 반환 (FastAPI가 자동으로 JSON 직렬화)
        return result
        
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
async def delete_answer(answer_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """GRI 답변 삭제 요청을 처리합니다."""
    try:
        logger.info(f"📝 GRI 답변 삭제 요청: ID {answer_id}")
        
        # AnswerController를 통해 서비스 호출
        result = await answer_controller.delete_answer(answer_id, db)
        
        logger.info(f"✅ GRI 답변 삭제 성공: ID {answer_id}")
        
        # 삭제 결과를 dict로 반환 (삭제는 보통 단순한 상태 메시지)
        return {
            "success": True,
            "message": f"GRI 답변 ID {answer_id}가 성공적으로 삭제되었습니다.",
            "deleted_id": answer_id
        }
        
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

# ===== 안전한 헬스체크 엔드포인트들 =====

@gri_router.get("/health", include_in_schema=False)
async def health():
    """기본 헬스체크 - DB 연결 없이"""
    return {"status": "ok", "service": "gri-service", "timestamp": datetime.now().isoformat()}

@gri_router.get("/health/db", include_in_schema=False)
async def health_db(db: AsyncSession = Depends(get_db)):
    """DB 연결 상태 진단"""
    try:
        # SQLAlchemy 2.0 스타일로 DB 연결 테스트
        result = await db.execute(select(1))
        test_value = result.scalar()
        
        if test_value == 1:
            return {"db": "ok", "service": "gri-service", "timestamp": datetime.now().isoformat()}
        else:
            raise HTTPException(status_code=503, detail="DB_QUERY_FAILED")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"DB health check failed: {e}")
        raise HTTPException(status_code=503, detail="DB_UNAVAILABLE")

# 메인 GRI 서비스 정보
@gri_router.get("/", summary="GRI 서비스 정보")
async def gri_service_info():
    """GRI 서비스 정보 및 엔드포인트 안내"""
    return {
        "service": "GRI Service",
        "version": "1.0.0",
        "description": "GRI Standards Service for TaeheonAI",
        "status": "running",
        "endpoints": {
            "categories": "GET /v1/gri/categories",
            "complete_data": "GET /v1/gri/complete/{category_id}",
            "create_answer": "POST /v1/gri/answers",
            "get_answer": "GET /v1/gri/answers/{id}",
            "get_answers": "GET /v1/gri/answers",
            "update_answer": "PUT /v1/gri/answers/{id}",
            "delete_answer": "DELETE /v1/gri/answers/{id}",
            "progress": "GET /v1/gri/progress/{session_key}",
            "health": "GET /v1/gri/health"
        },
        "base_url": "/v1/gri"
    }

# 루트 경로 리다이렉트 (Railway 호환성)
@gri_router.get("/", summary="루트 경로")
async def root():
    """루트 경로 - GRI 서비스로 리다이렉트"""
    return {
        "message": "GRI Service is running!",
        "redirect": "/v1/gri",
        "endpoints": {
            "main": "/v1/gri",
            "health": "/v1/gri/health",
            "categories": "/v1/gri/categories"
        }
    }
