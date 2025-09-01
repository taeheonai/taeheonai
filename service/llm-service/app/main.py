from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import logging
from datetime import datetime
from dotenv import load_dotenv, find_dotenv
import asyncio
import time

# 로컬 개발 편의: .env 있으면 로드, 없으면 무시(컨테이너/운영엔 .env 없음)
load_dotenv(find_dotenv(usecwd=True), override=False)

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
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
SERVICE_API_KEY = os.getenv("SERVICE_API_KEY", "default-service-key").strip()

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
    company_id: Optional[str] = None
    company_context: Optional[bool] = False  # 기업 컨텍스트 활성화 여부

class PolishResponse(BaseModel):
    polished_text: str
    model: str

@app.get("/health")
async def health_check():
    """헬스체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "llm-service",
        "timestamp": datetime.now().isoformat(),
        "async_support": True
    }

@app.post("/v1/polish")
async def polish(req: PolishRequest, x_api_key: str = Header(None, alias="x-api-key")):
    """GRI 답변 윤문 엔드포인트"""
    start_time = time.time()
    
    if x_api_key != SERVICE_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid service API key")

    try:
        # OpenAI API 키 확인
        _ = require_openai_key()

        logger.info(f"🚀 Polish request started for GRI index: {req.gri_index}, items: {len(req.answers)}")
        
        from app.domain.llm.llm_service import GriPolisher, RequirementItem
        
        # GriPolisher 인스턴스 생성
        polisher = GriPolisher(model="gpt-3.5-turbo")
        
        # 비동기로 윤문 처리 (타임아웃 설정)
        try:
            # 기업 컨텍스트가 활성화된 경우 추가 지시사항 생성
            extra_instructions = req.extra_instructions or ""
            if req.company_context and req.company_id:
                # 기업 정보 조회 (실제로는 DB에서 조회해야 함)
                company_name = "한온시스템"  # 임시로 하드코딩
                extra_instructions = f"""
                이 응답은 {company_name} 기업의 ESG 보고서를 위한 것입니다.
                모든 'ABC' 또는 '회사'라는 표현을 '{company_name}'으로 대체하고,
                기업 특성에 맞게 응답을 조정해주세요.
                
                {extra_instructions}
                """.strip()

            result = await asyncio.wait_for(
                polisher.polish(
                    gri_index=req.gri_index,
                    items=[RequirementItem(**it.model_dump()) for it in req.answers],
                    extra_instructions=extra_instructions,
                ),
                timeout=120.0  # 2분 타임아웃
            )
        except asyncio.TimeoutError:
            processing_time = time.time() - start_time
            logger.error(f"⏰ Polish request timeout for GRI index: {req.gri_index}, processing_time: {processing_time:.2f}s")
            raise HTTPException(status_code=408, detail="Request timeout - LLM processing took too long")
        
        processing_time = time.time() - start_time
        logger.info(f"✅ Polish completed for GRI index: {req.gri_index}, model: {result['model']}, processing_time: {processing_time:.2f}s")
        
        return {
            "status": "success",
            "data": {
                "polished_text": result["polished_text"],
                "model": result["model"],
                "created_at": datetime.utcnow().isoformat(),
                "processing_time_seconds": round(processing_time, 2)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"❌ Polish error for GRI index: {req.gri_index}, error: {str(e)}, processing_time: {processing_time:.2f}s")
        raise HTTPException(status_code=500, detail=f"Polish failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8005))
    uvicorn.run(app, host="0.0.0.0", port=port)