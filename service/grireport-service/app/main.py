from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="GRI Report Service",
    description="GRI Standards Report Generation Service for TaeheonAI",
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
gri_report_router = APIRouter()

# 요청 모델
class GRIReportRequest(BaseModel):
    company_data: dict
    gri_standards: list
    report_format: str = "pdf"

class GRIReportResponse(BaseModel):
    report_url: str
    timestamp: datetime
    report_id: str
    standards_covered: list

@gri_report_router.get("/health")
async def health_check():
    """헬스체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "gri-report-service",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@gri_report_router.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "GRI Report Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "generate": "/generate",
            "templates": "/templates",
            "standards": "/standards"
        }
    }

@gri_report_router.post("/generate")
async def generate_gri_report(request: GRIReportRequest):
    """GRI 보고서 생성"""
    try:
        logger.info(f"GRI report generation request for standards {request.gri_standards}")
        
        # GRI 보고서 생성 로직 (실제로는 AI 모델 연동)
        report_id = f"gri_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        report_url = f"https://reports.taeheonai.com/gri/{report_id}.{request.report_format}"
        
        return GRIReportResponse(
            report_url=report_url,
            timestamp=datetime.now(),
            report_id=report_id,
            standards_covered=request.gri_standards
        )
    except Exception as e:
        logger.error(f"GRI report generation error: {e}")
        raise HTTPException(status_code=500, detail="GRI report generation error")

@gri_report_router.get("/templates")
async def get_gri_templates():
    """GRI 보고서 템플릿 조회"""
    try:
        return {
            "templates": [
                {
                    "id": "gri-universal",
                    "name": "GRI Universal Standards",
                    "description": "GRI 101, 102, 103 표준 보고서",
                    "format": ["pdf", "docx"]
                },
                {
                    "id": "gri-economic",
                    "name": "GRI Economic Standards",
                    "description": "GRI 200 시리즈 경제적 영향 보고서",
                    "format": ["pdf", "html"]
                },
                {
                    "id": "gri-environmental",
                    "name": "GRI Environmental Standards",
                    "description": "GRI 300 시리즈 환경 영향 보고서",
                    "format": ["pdf"]
                },
                {
                    "id": "gri-social",
                    "name": "GRI Social Standards",
                    "description": "GRI 400 시리즈 사회적 영향 보고서",
                    "format": ["pdf", "docx"]
                }
            ],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"GRI templates error: {e}")
        raise HTTPException(status_code=500, detail="GRI templates retrieval error")

@gri_report_router.get("/standards")
async def get_gri_standards():
    """GRI 표준 목록 조회"""
    try:
        return {
            "standards": [
                {"code": "GRI-101", "name": "Foundation", "version": "2016", "category": "Universal"},
                {"code": "GRI-102", "name": "General Disclosures", "version": "2016", "category": "Universal"},
                {"code": "GRI-103", "name": "Management Approach", "version": "2016", "category": "Universal"},
                {"code": "GRI-201", "name": "Economic Performance", "version": "2016", "category": "Economic"},
                {"code": "GRI-202", "name": "Market Presence", "version": "2016", "category": "Economic"},
                {"code": "GRI-203", "name": "Indirect Economic Impacts", "version": "2016", "category": "Economic"},
                {"code": "GRI-301", "name": "Materials", "version": "2016", "category": "Environmental"},
                {"code": "GRI-302", "name": "Energy", "version": "2016", "category": "Environmental"},
                {"code": "GRI-303", "name": "Water and Effluents", "version": "2016", "category": "Environmental"},
                {"code": "GRI-304", "name": "Biodiversity", "version": "2016", "category": "Environmental"},
                {"code": "GRI-305", "name": "Emissions", "version": "2016", "category": "Environmental"},
                {"code": "GRI-306", "name": "Waste", "version": "2016", "category": "Environmental"},
                {"code": "GRI-307", "name": "Environmental Compliance", "version": "2016", "category": "Environmental"},
                {"code": "GRI-308", "name": "Supplier Environmental Assessment", "version": "2016", "category": "Environmental"},
                {"code": "GRI-401", "name": "Employment", "version": "2016", "category": "Social"},
                {"code": "GRI-402", "name": "Labor/Management Relations", "version": "2016", "category": "Social"},
                {"code": "GRI-403", "name": "Occupational Health and Safety", "version": "2016", "category": "Social"},
                {"code": "GRI-404", "name": "Training and Education", "version": "2016", "category": "Social"},
                {"code": "GRI-405", "name": "Diversity and Equal Opportunity", "version": "2016", "category": "Social"},
                {"code": "GRI-406", "name": "Non-discrimination", "version": "2016", "category": "Social"},
                {"code": "GRI-407", "name": "Freedom of Association and Collective Bargaining", "version": "2016", "category": "Social"},
                {"code": "GRI-408", "name": "Child Labor", "version": "2016", "category": "Social"},
                {"code": "GRI-409", "name": "Forced or Compulsory Labor", "version": "2016", "category": "Social"},
                {"code": "GRI-410", "name": "Security Practices", "version": "2016", "category": "Social"},
                {"code": "GRI-411", "name": "Rights of Indigenous Peoples", "version": "2016", "category": "Social"},
                {"code": "GRI-412", "name": "Human Rights Assessment", "version": "2016", "category": "Social"},
                {"code": "GRI-413", "name": "Local Communities", "version": "2016", "category": "Social"},
                {"code": "GRI-414", "name": "Supplier Social Assessment", "version": "2016", "category": "Social"},
                {"code": "GRI-415", "name": "Public Policy", "version": "2016", "category": "Social"},
                {"code": "GRI-416", "name": "Customer Health and Safety", "version": "2016", "category": "Social"},
                {"code": "GRI-417", "name": "Marketing and Labeling", "version": "2016", "category": "Social"},
                {"code": "GRI-418", "name": "Customer Privacy", "version": "2016", "category": "Social"},
                {"code": "GRI-419", "name": "Socioeconomic Compliance", "version": "2016", "category": "Social"}
            ],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"GRI standards error: {e}")
        raise HTTPException(status_code=500, detail="GRI standards retrieval error")

@gri_report_router.get("/reports/{report_id}")
async def get_gri_report_status(report_id: str):
    """GRI 보고서 상태 조회"""
    try:
        return {
            "report_id": report_id,
            "status": "completed",
            "progress": 100,
            "download_url": f"https://reports.taeheonai.com/gri/{report_id}.pdf",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"GRI report status error: {e}")
        raise HTTPException(status_code=500, detail="GRI report status retrieval error")

# 라우터를 앱에 포함
app.include_router(gri_report_router)

if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.getenv("PORT", 8008))
    uvicorn.run(app, host="0.0.0.0", port=port)
