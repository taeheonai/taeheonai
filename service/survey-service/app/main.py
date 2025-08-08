from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import uvicorn
import logging
import os

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("survey_main")

app = FastAPI(
    title="Survey Service API",
    description="Survey 서비스",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://taeheonai.com",
        "http://taeheonai.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# APIRouter 정의
survey_router = APIRouter()

@survey_router.get("/health")
async def health_check():
    """헬스체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "survey-service",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@survey_router.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "Survey Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health"
        }
    }

# 라우터를 앱에 포함
app.include_router(survey_router)

if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.getenv("PORT", 8007))
    uvicorn.run(app, host="0.0.0.0", port=port)
