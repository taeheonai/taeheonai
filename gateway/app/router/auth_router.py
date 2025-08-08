from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import httpx
import os

auth_router = APIRouter(prefix="/v1/auth", tags=["auth"])

# Auth service URL
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8008")

@auth_router.post("/signup")
async def signup(request: Request):
    """
    회원가입 요청을 auth-service로 전달
    """
    try:
        # 요청 본문 읽기
        body = await request.json()
        
        # Auth service로 요청 전달
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{AUTH_SERVICE_URL}/signup",
                json=body,
                timeout=30.0
            )
            
            return JSONResponse(
                status_code=response.status_code,
                content=response.json()
            )
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Auth service 연결 오류: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"회원가입 처리 중 오류: {str(e)}")

@auth_router.post("/login")
async def login(request: Request):
    """
    로그인 요청을 auth-service로 전달
    """
    try:
        # 요청 본문 읽기
        body = await request.json()
        
        # Auth service로 요청 전달
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{AUTH_SERVICE_URL}/login",
                json=body,
                timeout=30.0
            )
            
            return JSONResponse(
                status_code=response.status_code,
                content=response.json()
            )
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Auth service 연결 오류: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"로그인 처리 중 오류: {str(e)}")

@auth_router.get("/health")
async def health_check():
    """
    Auth service 헬스체크
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{AUTH_SERVICE_URL}/health", timeout=10.0)
            return JSONResponse(
                status_code=response.status_code,
                content=response.json()
            )
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Auth service 연결 오류: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"헬스체크 중 오류: {str(e)}")
