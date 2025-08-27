from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.router.corporation_router import corporation_router

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI 앱 생성
app = FastAPI(
    title="Corporation Service",
    description="기업 정보 관리 서비스",
    version="1.0.0"
)

# 라우터 등록
app.include_router(corporation_router)

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Corporation Service 시작")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 Corporation Service 종료")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "corporation-service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8009)
