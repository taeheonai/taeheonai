from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="GRI Service",
    description="GRI Standards Service for TaeheonAI",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 요청 모델
class GRIRequest(BaseModel):
    standard: str
    indicator: str
    data: dict

class GRIResponse(BaseModel):
    result: dict
    timestamp: datetime
    standard: str

@app.get("/health")
async def health_check():
    """헬스체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "gri-service",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "GRI Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "analyze": "/analyze",
            "standards": "/standards"
        }
    }

@app.post("/analyze")
async def analyze_gri(request: GRIRequest):
    """GRI 표준 분석"""
    try:
        logger.info(f"GRI analysis request for standard {request.standard}")
        
        # GRI 분석 로직 (실제로는 AI 모델 연동)
        result = {
            "standard": request.standard,
            "indicator": request.indicator,
            "score": 85.5,
            "recommendations": ["데이터 수집 개선 필요", "보고서 구조화 권장"]
        }
        
        return GRIResponse(
            result=result,
            timestamp=datetime.now(),
            standard=request.standard
        )
    except Exception as e:
        logger.error(f"GRI analysis error: {e}")
        raise HTTPException(status_code=500, detail="GRI analysis error")

@app.get("/standards")
async def get_gri_standards():
    """GRI 표준 목록 조회"""
    try:
        return {
            "standards": [
                {"code": "GRI-101", "name": "Foundation", "version": "2016"},
                {"code": "GRI-102", "name": "General Disclosures", "version": "2016"},
                {"code": "GRI-200", "name": "Economic", "version": "2016"},
                {"code": "GRI-300", "name": "Environmental", "version": "2016"},
                {"code": "GRI-400", "name": "Social", "version": "2016"}
            ],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Standards error: {e}")
        raise HTTPException(status_code=500, detail="Standards retrieval error")

if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.getenv("PORT", 8004))
    uvicorn.run(app, host="0.0.0.0", port=port) 