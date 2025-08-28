from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import logging

from app.common.database import get_db

logger = logging.getLogger(__name__)

gri_router = APIRouter(prefix="/v1/gri", tags=["gri"])


# ===== 헬스체크/상태 =====

@gri_router.get("/db-status")
async def database_status_check():
    """데이터베이스 상태 확인"""
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


@gri_router.get("/health", include_in_schema=False)
async def health():
    """기본 헬스체크 - DB 연결 없이"""
    return {"status": "ok", "service": "gri-service", "timestamp": datetime.now().isoformat()}


@gri_router.get("/health/db", include_in_schema=False)
async def health_db(db: AsyncSession = Depends(get_db)):
    """DB 연결 상태 진단"""
    try:
        result = await db.execute(select(1))
        test_value = result.scalar()
        if test_value == 1:
            return {"db": "ok", "service": "gri-service", "timestamp": datetime.now().isoformat()}
        raise HTTPException(status_code=503, detail="DB_QUERY_FAILED")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"DB health check failed: {e}")
        raise HTTPException(status_code=503, detail="DB_UNAVAILABLE")


# 메인 GRI 서비스 정보
@gri_router.get("/", summary="GRI 서비스 정보")
async def gri_service_info():
    return {
        "service": "GRI Service",
        "version": "1.0.0",
        "description": "GRI Standards Service for TaeheonAI",
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
            "polish": {
                "create": "POST /v1/gri/polish",
                "get": "GET /v1/gri/polish/{session_key}/{gri_index}",
                "list": "GET /v1/gri/polish/{session_key}",
                "clear": "DELETE /v1/gri/polish/{session_key}"
            },
            "health": {
                "check": "GET /v1/gri/health",
                "db": "GET /v1/gri/health/db",
                "status": "GET /v1/gri/db-status"
            }
        },
        "base_url": "/v1/gri"
    }