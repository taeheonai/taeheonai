from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import logging
from datetime import datetime
from dotenv import load_dotenv, find_dotenv

# 로컬 개발 편의: .env 있으면 로드, 없으면 무시(컨테이너/운영엔 .env 없음)
load_dotenv(find_dotenv(usecwd=True), override=False)

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("llm")

app = FastAPI(title="llm-service", version="1.0.0")

def require_openai_key() -> str:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        logger.error("OPENAI_API_KEY missing")
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY missing")
    return key

# OpenAI API 키 (LLM 호출용)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# 서비스 간 인증을 위한 API 키
SERVICE_API_KEY = os.getenv("SERVICE_API_KEY", "default-service-key")

# 요청/응답 스키마
class RequirementItemIn(BaseModel):
    question_id: int
    key_alpha: str
    text: str

class PolishRequest(BaseModel):
    session_key: str
    gri_index: str
    answers: List[RequirementItemIn]
    extra_instructions: Optional[str] = None

class PolishResponse(BaseModel):
    polished_text: str
    sources: List[Dict[str, Any]]
    model: str

@app.get("/health")
async def health_check():
    """헬스체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "llm-service",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/v1/polish")
async def polish(req: PolishRequest, x_api_key: str = Header(None, alias="X-Api-Key")):
    """GRI 답변 윤문 엔드포인트"""
    if x_api_key != SERVICE_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid service API key")

    try:
        # OpenAI API 키 확인
        _ = require_openai_key()

        logger.info(f"Polish request for GRI index: {req.gri_index}")
        
        from app.domain.llm.llm_service import GriPolisher, RequirementItem
        polisher = GriPolisher()
        result = await polisher.apolish(
            gri_index=req.gri_index,
            items=[RequirementItem(**it.model_dump()) for it in req.answers],  # items -> answers
            style=req.style,
            extra_instructions=req.extra_instructions,
        )
        
        logger.info(f"Polish completed using model: {result.model}")
        return {
            "polished_text": result.polished_text,
            "sources": result.sources,
            "model": result.model,
            "created_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Polish error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Polish failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8005))
    uvicorn.run(app, host="0.0.0.0", port=port)