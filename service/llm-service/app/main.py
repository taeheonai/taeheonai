from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import logging
from datetime import datetime
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# OpenAI API 키 설정
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not found in environment variables")

from app.domain.llm.llm_service import GriPolisher, RequirementItem

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="llm-service", version="1.0.0")

# 보안 키 (Gateway → slm-service 호출 시 필요)
SLM_API_KEY = os.getenv("SLM_API_KEY", "changeme-secret")

# 요청/응답 스키마
class RequirementItemIn(BaseModel):
    requirement_key: str
    input_text: str

class PolishRequest(BaseModel):
    gri_index: str
    items: List[RequirementItemIn]
    style: str = "중립"
    audience: str = "실무자"
    extra_instructions: Optional[str] = None

class PolishResponse(BaseModel):
    polished_text: str
    sources: List[Dict[str, Any]]
    model: str
    prompt_hash: str
    input_tokens: int
    output_tokens: int

@app.get("/health")
async def health_check():
    """헬스체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "llm-service",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/v1/polish", response_model=PolishResponse)
async def polish(req: PolishRequest, x_api_key: str = Header(None)):
    """GRI 답변 윤문 엔드포인트"""
    if x_api_key != SLM_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        logger.info(f"Polish request for GRI index: {req.gri_index}")
        
        polisher = GriPolisher()
        result = await polisher.apolish(
            gri_index=req.gri_index,
            items=[RequirementItem(**it.model_dump()) for it in req.items],
            style=req.style,
            audience=req.audience,
            extra_instructions=req.extra_instructions,
        )
        
        logger.info(f"Polish completed using model: {result.model}")
        return PolishResponse(
            polished_text=result.polished_text,
            sources=result.sources,
            model=result.model,
            prompt_hash=result.prompt_hash,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
        )
        
    except Exception as e:
        logger.error(f"Polish error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Polish failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8005))
    uvicorn.run(app, host="0.0.0.0", port=port)