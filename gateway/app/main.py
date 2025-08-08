"""
gateway-router 메인 파일 (정리본)
"""
from typing import Optional, List
from enum import Enum
import os
import sys
import json
import logging
from contextlib import asynccontextmanager

from fastapi import (
    APIRouter, FastAPI, Request, UploadFile, Query, HTTPException
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# 로컬 개발 시 .env 로딩 (Railway 등 배포환경에선 스킵)
if not os.getenv("RAILWAY_ENVIRONMENT"):
    from dotenv import load_dotenv
    load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("gateway_api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Gateway API 서비스 시작")
    yield
    logger.info("🛑 Gateway API 서비스 종료")


app = FastAPI(
    title="Gateway API",
    description="Gateway API for ausikor.com",
    version="0.1.0",
    docs_url="/docs",
    lifespan=lifespan,
)

# CORS — taeheonai.com 도메인만 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://taeheonai.com", "http://taeheonai.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

gateway_router = APIRouter(prefix="/api/v1", tags=["Gateway API"])

# 파일필수 서비스(없다면 빈 세트 유지)
FILE_REQUIRED_SERVICES: set[str] = set()


class ServiceType(str, Enum):
    chatbot = "chatbot"
    gri = "gri"
    materiality = "materiality"
    tcfd = "tcfd"
    grireport = "grireport"
    tcfdreport = "tcfdreport"


class ServiceDiscovery:
    def __init__(self, service_type: ServiceType):
        self.service_type = service_type
        self.base_urls = {
            ServiceType.chatbot: "http://chatbot-service:8001",
            ServiceType.gri: "http://gri-service:8003",
            ServiceType.materiality: "http://materiality-service:8002",
            ServiceType.tcfd: "http://tcfd-service:8005",
            ServiceType.grireport: "http://grireport-service:8004",
            ServiceType.tcfdreport: "http://tcfdreport-service:8006",
        }

    async def request(
        self,
        method: str,
        path: str,
        headers: dict | None = None,
        body: bytes | None = None,
        files: dict | None = None,
        params: dict | None = None,
        data: dict | None = None,
    ):
        import httpx

        base_url = self.base_urls.get(self.service_type)
        if not base_url:
            raise HTTPException(status_code=404, detail=f"Service {self.service_type} not found")

        # ✅ path는 반드시 슬래시 보장
        path = "/" + path.lstrip("/")
        url = f"{base_url}{path}"

        async with httpx.AsyncClient() as client:
            try:
                if method.upper() == "GET":
                    response = await client.get(url, headers=headers, params=params)
                elif method.upper() == "POST":
                    if files:
                        response = await client.post(url, headers=headers, files=files, params=params)
                    elif data:
                        response = await client.post(url, headers=headers, json=data, params=params)
                    else:
                        response = await client.post(url, headers=headers, content=body, params=params)
                elif method.upper() == "PUT":
                    response = await client.put(url, headers=headers, content=body, params=params)
                elif method.upper() == "DELETE":
                    response = await client.delete(url, headers=headers, params=params)
                elif method.upper() == "PATCH":
                    response = await client.patch(url, headers=headers, content=body, params=params)
                else:
                    raise HTTPException(status_code=405, detail=f"Method {method} not allowed")

                return response
            except httpx.RequestError as e:
                logger.error(f"Request error: {e}")
                raise HTTPException(status_code=503, detail=f"Service {self.service_type} unavailable")


class ResponseFactory:
    @staticmethod
    def create_response(response):
        # JSON이면 JSON으로, 아니면 텍스트로
        try:
            return JSONResponse(
                content=response.json(),
                status_code=response.status_code,
                headers=dict(response.headers)
            )
        except:
            return JSONResponse(
                content={"detail": response.text},
                status_code=response.status_code,
                headers=dict(response.headers)
            )


@gateway_router.get("/health", summary="게이트웨이 헬스체크")
async def health_check():
    return {
        "status": "healthy",
        "service": "gateway",
        "timestamp": "2024-01-01T00:00:00Z",
        "version": "0.1.0"
    }


# ---------- Proxy ----------
@gateway_router.get("/{service}/{path:path}", summary="GET 프록시")
async def proxy_get(service: ServiceType, path: str, request: Request):
    try:
        factory = ServiceDiscovery(service_type=service)
        headers = dict(request.headers)
        # ✅ 쿼리 파라미터 전달
        params = dict(request.query_params)
        resp = await factory.request(
            method="GET",
            path=path,
            headers=headers,
            params=params,
        )
        return ResponseFactory.create_response(resp)
    except Exception as e:
        logger.error(f"Error in GET proxy: {str(e)}")
        return JSONResponse(content={"detail": f"Error processing request: {str(e)}"}, status_code=500)


@gateway_router.post("/{service}/{path:path}", summary="POST 프록시")
async def proxy_post(
    service: ServiceType,
    path: str,
    request: Request,
    file: Optional[UploadFile] = None,
    sheet_names: Optional[List[str]] = Query(None, alias="sheet_name"),
):
    try:
        logger.info(f"🌈 POST 요청 받음: 서비스={service}, 경로={path}")
        if file:
            logger.info(f"파일명: {file.filename}, 시트 이름: {sheet_names if sheet_names else '없음'}")

        factory = ServiceDiscovery(service_type=service)
        headers = dict(request.headers)

        files = None
        params = dict(request.query_params) if request.query_params else None
        body = None
        data = None

        if service in FILE_REQUIRED_SERVICES:
            if "upload" in path and not file:
                raise HTTPException(status_code=400, detail=f"서비스 {service}에는 파일 업로드가 필요합니다.")

            if file:
                file_content = await file.read()
                files = {"file": (file.filename, file_content, file.content_type)}
                await file.seek(0)

            if sheet_names:
                params = params or {}
                params["sheet_name"] = sheet_names
        else:
            body = await request.body()

        resp = await factory.request(
            method="POST",
            path=path,
            headers=headers,
            body=body,
            files=files,
            params=params,
            data=data,
        )
        return ResponseFactory.create_response(resp)

    except HTTPException as he:
        return JSONResponse(content={"detail": he.detail}, status_code=he.status_code)
    except Exception as e:
        logger.error(f"POST 요청 처리 중 오류 발생: {str(e)}")
        return JSONResponse(content={"detail": f"Gateway error: {str(e)}"}, status_code=500)


@gateway_router.put("/{service}/{path:path}", summary="PUT 프록시")
async def proxy_put(service: ServiceType, path: str, request: Request):
    try:
        factory = ServiceDiscovery(service_type=service)
        headers = dict(request.headers)
        body = await request.body()
        params = dict(request.query_params)
        resp = await factory.request(
            method="PUT",
            path=path,
            headers=headers,
            body=body,
            params=params,
        )
        return ResponseFactory.create_response(resp)
    except Exception as e:
        logger.error(f"Error in PUT proxy: {str(e)}")
        return JSONResponse(content={"detail": f"Error processing request: {str(e)}"}, status_code=500)


@gateway_router.delete("/{service}/{path:path}", summary="DELETE 프록시")
async def proxy_delete(service: ServiceType, path: str, request: Request):
    try:
        factory = ServiceDiscovery(service_type=service)
        headers = dict(request.headers)
        params = dict(request.query_params)
        resp = await factory.request(
            method="DELETE",
            path=path,
            headers=headers,
            params=params,
        )
        return ResponseFactory.create_response(resp)
    except Exception as e:
        logger.error(f"Error in DELETE proxy: {str(e)}")
        return JSONResponse(content={"detail": f"Error processing request: {str(e)}"}, status_code=500)


@gateway_router.patch("/{service}/{path:path}", summary="PATCH 프록시")
async def proxy_patch(service: ServiceType, path: str, request: Request):
    try:
        factory = ServiceDiscovery(service_type=service)
        headers = dict(request.headers)
        body = await request.body()
        params = dict(request.query_params)
        resp = await factory.request(
            method="PATCH",
            path=path,
            headers=headers,
            body=body,
            params=params,
        )
        return ResponseFactory.create_response(resp)
    except Exception as e:
        logger.error(f"Error in PATCH proxy: {str(e)}")
        return JSONResponse(content={"detail": f"Error processing request: {str(e)}"}, status_code=500)


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(content={"detail": "Service not found"}, status_code=404)


@app.get("/")
async def root():
    return {
        "message": "Gateway API",
        "version": "0.1.0",
        "docs": "/docs"
    }

# 라우터를 앱에 포함
app.include_router(gateway_router)

# ✅ 모듈 경로 정확히
if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.getenv("PORT", 8080))
    uvicorn.run("gateway.app.main:app", host="0.0.0.0", port=port, reload=True)
