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

# CORS — 초기엔 전체 허용으로 빠르게 확인, 이후 프론트 도메인으로 좁혀가도 됨
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    report = "report"
    tcfd = "tcfd"


class ServiceDiscovery:
    def __init__(self, service_type: ServiceType):
        self.service_type = service_type
        self.base_urls = {
            ServiceType.chatbot: "http://chatbot-service:8003",
            ServiceType.gri: "http://gri-service:8004",
            ServiceType.materiality: "http://materiality-service:8005",
            ServiceType.report: "http://report-service:8006",
            ServiceType.tcfd: "http://tcfd-service:8007",
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
            resp = await client.request(
                method=method,
                url=url,
                headers=headers,
                content=body,
                files=files,
                params=params,  # ✅ 쿼리스트링 전달
                data=data,
                timeout=30.0,
            )
            return resp


class ResponseFactory:
    @staticmethod
    def create_response(response):
        # JSON이면 JSON으로, 아니면 텍스트로
        content_type = response.headers.get("content-type", "")
        if content_type.startswith("application/json"):
            content = response.json()
        else:
            # JSONResponse에 str을 넣어도 되지만, plain text면 그대로 반환
            return JSONResponse(
                content=response.text,
                status_code=response.status_code,
                headers={"content-type": content_type},
            )
        return JSONResponse(content=content, status_code=response.status_code)


# ---------- Basic Health ----------
@gateway_router.get("/health", summary="게이트웨이 헬스체크")
async def health_check():
    logger.info("health check")
    return {"status": "healthy!"}


# ---------- Demo auth payload log ----------
class SignupPayload(BaseModel):
    company_id: Optional[str] = Field(default=None)
    industry: Optional[str] = Field(default=None)
    email: Optional[str] = Field(default=None)
    name: Optional[str] = Field(default=None)
    age: Optional[str] = Field(default=None)
    auth_id: str
    auth_pw: str


class LoginPayload(BaseModel):
    auth_id: str
    auth_pw: str


@gateway_router.post("/auth/signup", summary="회원가입 입력 로깅 (미저장)")
async def auth_signup_log(payload: SignupPayload):
    logger.info("[AUTH][SIGNUP] 입력 데이터: %s", json.dumps(payload.model_dump(), ensure_ascii=False))
    return {"ok": True, "message": "signup payload logged"}


@gateway_router.post("/auth/login", summary="로그인 입력 로깅 (미저장)")
async def auth_login_log(payload: LoginPayload):
    logger.info("[AUTH][LOGIN] 입력 데이터: %s", json.dumps(payload.model_dump(), ensure_ascii=False))
    return {"ok": True, "message": "login payload logged"}


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
        params = dict(request.query_params) if request.query_params else None
        resp = await factory.request(method="PUT", path=path, headers=headers, body=body, params=params)
        return ResponseFactory.create_response(resp)
    except Exception as e:
        logger.error(f"Error in PUT proxy: {str(e)}")
        return JSONResponse(content={"detail": f"Error processing request: {str(e)}"}, status_code=500)


@gateway_router.delete("/{service}/{path:path}", summary="DELETE 프록시")
async def proxy_delete(service: ServiceType, path: str, request: Request):
    try:
        factory = ServiceDiscovery(service_type=service)
        headers = dict(request.headers)
        params = dict(request.query_params) if request.query_params else None
        resp = await factory.request(method="DELETE", path=path, headers=headers, params=params)
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
        params = dict(request.query_params) if request.query_params else None
        resp = await factory.request(method="PATCH", path=path, headers=headers, body=body, params=params)
        return ResponseFactory.create_response(resp)
    except Exception as e:
        logger.error(f"Error in PATCH proxy: {str(e)}")
        return JSONResponse(content={"detail": f"Error processing request: {str(e)}"}, status_code=500)


# 모든 라우트 정의 후 라우터 등록
app.include_router(gateway_router)

# 404 에러 핸들러
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(status_code=404, content={"detail": "요청한 리소스를 찾을 수 없습니다."})

# 기본 루트
@app.get("/")
async def root():
    return {"message": "Gateway API", "version": "0.1.0"}

# ⚠️ 중복이던 app 레벨 /api/v1/health 는 제거 (router 하나만 유지)

# ✅ 서버 실행 (로컬 전용)
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    # ✅ 모듈 경로 정확히
    uvicorn.run("gateway.app.main:app", host="0.0.0.0", port=port, reload=True)
