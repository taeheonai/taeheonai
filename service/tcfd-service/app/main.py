from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TCFD Service",
    description="TCFD Framework Service for TaeheonAI",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://taeheonai.com", "http://taeheonai.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# APIRouter 정의
tcfd_router = APIRouter()

# 요청 모델
class TCFDRequest(BaseModel):
    company_data: dict
    scenario: str
    timeframe: str

class TCFDResponse(BaseModel):
    analysis: dict
    timestamp: datetime
    risk_score: float

@tcfd_router.get("/health")
async def health_check():
    """헬스체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "tcfd-service",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@tcfd_router.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "TCFD Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "analyze": "/analyze",
            "scenarios": "/scenarios"
        }
    }

@tcfd_router.post("/analyze")
async def analyze_tcfd(request: TCFDRequest):
    """TCFD 분석"""
    try:
        logger.info(f"TCFD analysis request for scenario {request.scenario}")
        
        # TCFD 분석 로직 (실제로는 AI 모델 연동)
        analysis = {
            "governance": {
                "score": 8.5,
                "recommendations": ["기후 리스크 관리 체계 강화"]
            },
            "strategy": {
                "score": 7.2,
                "recommendations": ["기후 시나리오 분석 확대"]
            },
            "risk_management": {
                "score": 9.1,
                "recommendations": ["기후 리스크 평가 프로세스 개선"]
            },
            "metrics_targets": {
                "score": 6.8,
                "recommendations": ["기후 관련 KPI 설정"]
            }
        }
        
        return TCFDResponse(
            analysis=analysis,
            timestamp=datetime.now(),
            risk_score=7.9
        )
    except Exception as e:
        logger.error(f"TCFD analysis error: {e}")
        raise HTTPException(status_code=500, detail="TCFD analysis error")

@tcfd_router.get("/scenarios")
async def get_climate_scenarios():
    """기후 시나리오 조회"""
    try:
        return {
            "scenarios": [
                {
                    "id": "ssp1-2.6",
                    "name": "SSP1-2.6",
                    "description": "낮은 기후 변화 시나리오",
                    "temperature_rise": "1.5-2.0°C"
                },
                {
                    "id": "ssp2-4.5",
                    "name": "SSP2-4.5",
                    "description": "중간 기후 변화 시나리오",
                    "temperature_rise": "2.0-3.0°C"
                },
                {
                    "id": "ssp5-8.5",
                    "name": "SSP5-8.5",
                    "description": "높은 기후 변화 시나리오",
                    "temperature_rise": "3.0-5.0°C"
                }
            ],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Scenarios error: {e}")
        raise HTTPException(status_code=500, detail="Scenarios retrieval error")

@tcfd_router.get("/framework")
async def get_tcfd_framework():
    """TCFD 프레임워크 조회"""
    try:
        return {
            "framework": {
                "governance": "기후 관련 리스크와 기회에 대한 거버넌스",
                "strategy": "기후 관련 리스크와 기회가 비즈니스 전략에 미치는 영향",
                "risk_management": "기후 관련 리스크의 식별, 평가 및 관리",
                "metrics_targets": "기후 관련 리스크와 기회를 평가하기 위한 지표와 목표"
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Framework error: {e}")
        raise HTTPException(status_code=500, detail="Framework retrieval error")

# 라우터를 앱에 포함
app.include_router(tcfd_router)

if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.getenv("PORT", 8005))
    uvicorn.run(app, host="0.0.0.0", port=port) 