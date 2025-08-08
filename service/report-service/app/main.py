from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Report Service",
    description="ESG Report Generation Service for TaeheonAI",
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

# 요청 모델
class ReportRequest(BaseModel):
    company_data: dict
    report_type: str
    format: str = "pdf"

class ReportResponse(BaseModel):
    report_url: str
    timestamp: datetime
    report_id: str

@app.get("/health")
async def health_check():
    """헬스체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "report-service",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "Report Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "generate": "/generate",
            "templates": "/templates"
        }
    }

@app.post("/generate")
async def generate_report(request: ReportRequest):
    """보고서 생성"""
    try:
        logger.info(f"Report generation request for type {request.report_type}")
        
        # 보고서 생성 로직 (실제로는 AI 모델 연동)
        report_id = f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        report_url = f"https://reports.taeheonai.com/{report_id}.{request.format}"
        
        return ReportResponse(
            report_url=report_url,
            timestamp=datetime.now(),
            report_id=report_id
        )
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        raise HTTPException(status_code=500, detail="Report generation error")

@app.get("/templates")
async def get_report_templates():
    """보고서 템플릿 조회"""
    try:
        return {
            "templates": [
                {
                    "id": "esg-annual",
                    "name": "ESG 연간보고서",
                    "description": "기업 ESG 연간보고서 템플릿",
                    "format": ["pdf", "docx"]
                },
                {
                    "id": "sustainability",
                    "name": "지속가능성보고서",
                    "description": "GRI 기준 지속가능성보고서",
                    "format": ["pdf", "html"]
                },
                {
                    "id": "tcfd",
                    "name": "TCFD 보고서",
                    "description": "기후 관련 재무정보공시 보고서",
                    "format": ["pdf"]
                }
            ],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Templates error: {e}")
        raise HTTPException(status_code=500, detail="Templates retrieval error")

@app.get("/reports/{report_id}")
async def get_report_status(report_id: str):
    """보고서 상태 조회"""
    try:
        return {
            "report_id": report_id,
            "status": "completed",
            "progress": 100,
            "download_url": f"https://reports.taeheonai.com/{report_id}.pdf",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Report status error: {e}")
        raise HTTPException(status_code=500, detail="Report status retrieval error")

if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.getenv("PORT", 8006))
    uvicorn.run(app, host="0.0.0.0", port=port) 