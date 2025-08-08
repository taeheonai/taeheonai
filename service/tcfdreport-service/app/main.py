from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TCFD Report Service",
    description="TCFD Framework Report Generation Service for TaeheonAI",
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
tcfd_report_router = APIRouter()

# 요청 모델
class TCFDReportRequest(BaseModel):
    company_data: dict
    tcfd_pillars: list
    scenario_analysis: dict
    report_format: str = "pdf"

class TCFDReportResponse(BaseModel):
    report_url: str
    timestamp: datetime
    report_id: str
    pillars_covered: list

@tcfd_report_router.get("/health")
async def health_check():
    """헬스체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "tcfd-report-service",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@tcfd_report_router.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "TCFD Report Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "generate": "/generate",
            "templates": "/templates",
            "pillars": "/pillars"
        }
    }

@tcfd_report_router.post("/generate")
async def generate_tcfd_report(request: TCFDReportRequest):
    """TCFD 보고서 생성"""
    try:
        logger.info(f"TCFD report generation request for pillars {request.tcfd_pillars}")
        
        # TCFD 보고서 생성 로직 (실제로는 AI 모델 연동)
        report_id = f"tcfd_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        report_url = f"https://reports.taeheonai.com/tcfd/{report_id}.{request.report_format}"
        
        return TCFDReportResponse(
            report_url=report_url,
            timestamp=datetime.now(),
            report_id=report_id,
            pillars_covered=request.tcfd_pillars
        )
    except Exception as e:
        logger.error(f"TCFD report generation error: {e}")
        raise HTTPException(status_code=500, detail="TCFD report generation error")

@tcfd_report_router.get("/templates")
async def get_tcfd_templates():
    """TCFD 보고서 템플릿 조회"""
    try:
        return {
            "templates": [
                {
                    "id": "tcfd-full",
                    "name": "TCFD 완전 보고서",
                    "description": "TCFD 4개 핵심 영역 전체 보고서",
                    "format": ["pdf", "docx"]
                },
                {
                    "id": "tcfd-governance",
                    "name": "TCFD 거버넌스 보고서",
                    "description": "기후 관련 리스크와 기회에 대한 거버넌스",
                    "format": ["pdf", "html"]
                },
                {
                    "id": "tcfd-strategy",
                    "name": "TCFD 전략 보고서",
                    "description": "기후 관련 리스크와 기회가 비즈니스 전략에 미치는 영향",
                    "format": ["pdf"]
                },
                {
                    "id": "tcfd-risk",
                    "name": "TCFD 리스크 관리 보고서",
                    "description": "기후 관련 리스크의 식별, 평가 및 관리",
                    "format": ["pdf", "docx"]
                },
                {
                    "id": "tcfd-metrics",
                    "name": "TCFD 지표 및 목표 보고서",
                    "description": "기후 관련 리스크와 기회를 평가하기 위한 지표와 목표",
                    "format": ["pdf", "xlsx"]
                }
            ],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"TCFD templates error: {e}")
        raise HTTPException(status_code=500, detail="TCFD templates retrieval error")

@tcfd_report_router.get("/pillars")
async def get_tcfd_pillars():
    """TCFD 핵심 영역 조회"""
    try:
        return {
            "pillars": [
                {
                    "id": "governance",
                    "name": "거버넌스",
                    "description": "기후 관련 리스크와 기회에 대한 거버넌스",
                    "disclosures": [
                        "기후 관련 리스크와 기회에 대한 감독 역할",
                        "관리진의 기후 관련 리스크와 기회 관리 역할"
                    ]
                },
                {
                    "id": "strategy",
                    "name": "전략",
                    "description": "기후 관련 리스크와 기회가 비즈니스 전략에 미치는 영향",
                    "disclosures": [
                        "기후 관련 리스크와 기회의 식별",
                        "기후 관련 리스크와 기회의 영향",
                        "기후 관련 시나리오 분석"
                    ]
                },
                {
                    "id": "risk_management",
                    "name": "리스크 관리",
                    "description": "기후 관련 리스크의 식별, 평가 및 관리",
                    "disclosures": [
                        "기후 관련 리스크의 식별 및 평가 프로세스",
                        "기후 관련 리스크의 관리 프로세스",
                        "기후 관련 리스크 관리 프로세스의 통합"
                    ]
                },
                {
                    "id": "metrics_targets",
                    "name": "지표 및 목표",
                    "description": "기후 관련 리스크와 기회를 평가하기 위한 지표와 목표",
                    "disclosures": [
                        "기후 관련 리스크와 기회를 평가하기 위한 지표",
                        "Scope 1, Scope 2, Scope 3 온실가스 배출량",
                        "기후 관련 목표"
                    ]
                }
            ],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"TCFD pillars error: {e}")
        raise HTTPException(status_code=500, detail="TCFD pillars retrieval error")

@tcfd_report_router.get("/scenarios")
async def get_climate_scenarios():
    """기후 시나리오 조회"""
    try:
        return {
            "scenarios": [
                {
                    "id": "ssp1-2.6",
                    "name": "SSP1-2.6",
                    "description": "낮은 기후 변화 시나리오",
                    "temperature_rise": "1.5-2.0°C",
                    "timeframe": "2050년까지"
                },
                {
                    "id": "ssp2-4.5",
                    "name": "SSP2-4.5",
                    "description": "중간 기후 변화 시나리오",
                    "temperature_rise": "2.0-3.0°C",
                    "timeframe": "2050년까지"
                },
                {
                    "id": "ssp5-8.5",
                    "name": "SSP5-8.5",
                    "description": "높은 기후 변화 시나리오",
                    "temperature_rise": "3.0-5.0°C",
                    "timeframe": "2050년까지"
                }
            ],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Climate scenarios error: {e}")
        raise HTTPException(status_code=500, detail="Climate scenarios retrieval error")

@tcfd_report_router.get("/reports/{report_id}")
async def get_tcfd_report_status(report_id: str):
    """TCFD 보고서 상태 조회"""
    try:
        return {
            "report_id": report_id,
            "status": "completed",
            "progress": 100,
            "download_url": f"https://reports.taeheonai.com/tcfd/{report_id}.pdf",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"TCFD report status error: {e}")
        raise HTTPException(status_code=500, detail="TCFD report status retrieval error")

# 라우터를 앱에 포함
app.include_router(tcfd_report_router)

if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.getenv("PORT", 8006))
    uvicorn.run(app, host="0.0.0.0", port=port)
