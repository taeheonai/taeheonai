from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime
import logging
import os

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Materiality Service",
    description="Materiality Assessment Service for TaeheonAI",
    version="1.0.0"
)

# APIRouter 정의
materiality_router = APIRouter(prefix="/v1/materiality")

# 요청 모델
class MaterialityRequest(BaseModel):
    company_data: dict
    stakeholders: list
    criteria: dict

class MaterialityResponse(BaseModel):
    assessment: dict
    timestamp: datetime
    score: float

@materiality_router.get("/health")
async def health_check():
    """헬스체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "materiality-service",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@materiality_router.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "Materiality Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/v1/materiality/health",
            "assess": "/v1/materiality/assess",
            "criteria": "/v1/materiality/criteria",
            "issuepools": "/v1/materiality/random/{limit}"
        }
    }

@materiality_router.post("/assess")
async def assess_materiality(request: MaterialityRequest):
    """중요성 평가"""
    try:
        logger.info(f"Materiality assessment request")
        
        # 중요성 평가 로직 (실제로는 AI 모델 연동)
        assessment = {
            "environmental": 8.5,
            "social": 7.2,
            "governance": 9.1,
            "economic": 6.8,
            "recommendations": [
                "환경 영향 평가 강화",
                "이해관계자 참여 확대",
                "거버넌스 체계 개선"
            ]
        }
        
        return MaterialityResponse(
            assessment=assessment,
            timestamp=datetime.now(),
            score=8.2
        )
    except Exception as e:
        logger.error(f"Materiality assessment error: {e}")
        raise HTTPException(status_code=500, detail="Materiality assessment error")

@materiality_router.get("/criteria")
async def get_assessment_criteria():
    """평가 기준 조회"""
    try:
        return {
            "criteria": {
                "environmental": ["탄소 배출", "에너지 효율", "폐기물 관리"],
                "social": ["인권", "노동 조건", "지역 사회"],
                "governance": ["윤리 경영", "투명성", "이사회 구성"],
                "economic": ["재무 성과", "혁신", "시장 경쟁력"]
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Criteria error: {e}")
        raise HTTPException(status_code=500, detail="Criteria retrieval error")

# 라우터를 앱에 포함
app.include_router(materiality_router)

# IssuePool 관련 라우터 추가
try:
    from app.router.issuepool_router import router as issuepool_router
    app.include_router(issuepool_router)
    logger.info("IssuePool router loaded successfully")
except ImportError as e:
    logger.warning(f"Could not load IssuePool router: {e}")
    logger.info("IssuePool functionality will not be available")

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)