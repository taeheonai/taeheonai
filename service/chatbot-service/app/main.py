from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Chatbot Service",
    description="AI Chatbot Service for TaeheonAI",
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
chatbot_router = APIRouter()

# 요청 모델
class ChatRequest(BaseModel):
    message: str
    user_id: str = None
    session_id: str = None

class ChatResponse(BaseModel):
    response: str
    timestamp: datetime
    session_id: str

@chatbot_router.get("/health")
async def health_check():
    """헬스체크 엔드포인트"""
    return {
        "status": "healthy",
        "service": "chatbot-service",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@chatbot_router.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "Chatbot Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "chat": "/chat"
        }
    }

@chatbot_router.post("/chat")
async def chat(request: ChatRequest):
    """채팅 요청 처리"""
    try:
        logger.info(f"Chat request from user {request.user_id}")
        
        # 간단한 응답 (실제로는 AI 모델 연동)
        response = f"안녕하세요! '{request.message}'에 대한 답변입니다."
        
        return ChatResponse(
            response=response,
            timestamp=datetime.now(),
            session_id=request.session_id or "default"
        )
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Chat processing error")

@chatbot_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """채팅 히스토리 조회"""
    try:
        # 실제로는 데이터베이스에서 조회
        return {
            "session_id": session_id,
            "messages": [],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"History error: {e}")
        raise HTTPException(status_code=500, detail="History retrieval error")

# 라우터를 앱에 포함
app.include_router(chatbot_router)

if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.getenv("PORT", 8003))
    uvicorn.run(app, host="0.0.0.0", port=port) 