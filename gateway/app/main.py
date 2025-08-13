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
from datetime import datetime

from fastapi import (
    APIRouter, FastAPI, Request, UploadFile, Query, HTTPException
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

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

# CORS 설정 - 환경별 분기
is_railway = os.getenv("RAILWAY_ENVIRONMENT") == "true"

if is_railway:
    cors_origins = [
        "https://taeheonai.com",
        "http://taeheonai.com",
        "https://www.taeheonai.com",
        "http://www.taeheonai.com",
    ]
    logger.info("🌐 Railway 프로덕션 환경 CORS 설정 적용")
else:
    cors_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://frontend:3000",
    ]
    logger.info("💻 로컬 개발 환경 CORS 설정 적용")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
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
    auth = "auth"


class ServiceDiscovery:
    def __init__(self, service_type: ServiceType):
        self.service_type = service_type  # ✅ 보관
        # 환경변수에서 서비스 URL 가져오기 (기본값은 로컬 개발용)
        self.base_urls = {
            ServiceType.chatbot: os.getenv("CHATBOT_SERVICE_URL", "http://localhost:8001"),
            ServiceType.gri: os.getenv("GRI_SERVICE_URL", "http://localhost:8003"),
            ServiceType.materiality: os.getenv("MATERIALITY_SERVICE_URL", "http://localhost:8002"),
            ServiceType.tcfd: os.getenv("TCFD_SERVICE_URL", "http://localhost:8005"),
            ServiceType.grireport: os.getenv("GRIREPORT_SERVICE_URL", "http://localhost:8004"),
            ServiceType.tcfdreport: os.getenv("TCFDREPORT_SERVICE_URL", "http://localhost:8006"),
            ServiceType.auth: os.getenv("AUTH_SERVICE_URL", "http://localhost:8008"),
        }
        self.is_railway = os.getenv("RAILWAY_ENVIRONMENT") == "true"
        if self.is_railway:
            logger.info(f"🌐 Railway 환경에서 {service_type} 서비스 연결 시도")
        else:
            logger.info(f"💻 로컬 환경에서 {service_type} 서비스 연결 시도")

    def upstream_path(self, path: str) -> str:
        """서비스별 업스트림 접두사(/v1/{service}) 자동 부착"""
        path = "/" + path.lstrip("/")
        prefixes = {
            ServiceType.auth: "/v1/auth",
            ServiceType.chatbot: "/v1/chatbot",
            ServiceType.gri: "/v1/gri",
            ServiceType.materiality: "/v1/materiality",
            ServiceType.tcfd: "/v1/tcfd",
            ServiceType.grireport: "/v1/grireport",
            ServiceType.tcfdreport: "/v1/tcfdreport",
        }
        prefix = prefixes.get(self.service_type, "")
        if not prefix:
            return path
        
        # 이미 접두사가 포함된 경우(예: /v1/auth/...)는 중복 방지
        if path == prefix or path.startswith(prefix + "/"):
            return path
        
        # /api/v1/auth/login → /v1/auth/login으로 변환
        if path.startswith("/api/v1/"):
            return path[4:]  # /api 제거
        
        return f"{prefix}{path}"

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

        full_path = self.upstream_path(path)  # ✅ 접두사 포함 경로
        url = f"{base_url}{full_path}"

        # 업스트림에 보낼 헤더 정리
        fwd_headers = dict(headers or {})
        fwd_headers.pop("host", None)  # ✅ Host 제거

        async with httpx.AsyncClient() as client:
            try:
                m = method.upper()
                if m == "GET":
                    response = await client.get(url, headers=fwd_headers, params=params)
                elif m == "POST":
                    if files:
                        response = await client.post(url, headers=fwd_headers, files=files, params=params)
                    elif data is not None:
                        response = await client.post(url, headers=fwd_headers, json=data, params=params)
                    else:
                        # body가 bytes인 경우 json으로 변환 시도
                        try:
                            body_json = json.loads(body.decode("utf-8")) if body else {}
                            response = await client.post(url, headers=fwd_headers, json=body_json, params=params)
                        except (json.JSONDecodeError, AttributeError, UnicodeDecodeError):
                            response = await client.post(url, headers=fwd_headers, content=body, params=params)
                elif m == "PUT":
                    response = await client.put(url, headers=fwd_headers, content=body, params=params)
                elif m == "DELETE":
                    response = await client.delete(url, headers=fwd_headers, params=params)
                elif m == "PATCH":
                    response = await client.patch(url, headers=fwd_headers, content=body, params=params)
                else:
                    raise HTTPException(status_code=405, detail=f"Method {method} not allowed")
                return response
            except httpx.RequestError as e:
                logger.error(f"Request error: {e}")
                raise HTTPException(status_code=503, detail=f"Service {self.service_type} unavailable")


class ResponseFactory:
    @staticmethod
    def create_response(response):
        # 업스트림 헤더 중 hop-by-hop/충돌 유발 헤더 제거
        unsafe_headers = {
            "content-length", "transfer-encoding", "content-encoding",
            "connection", "date", "server"
        }
        safe_headers = {k: v for k, v in response.headers.items() if k.lower() not in unsafe_headers}

        # 콘텐츠 타입에 따라 JSON/바이너리 분기
        content_type = response.headers.get("content-type", "")
        try:
            if content_type.startswith("application/json"):
                return JSONResponse(
                    content=response.json(),
                    status_code=response.status_code,
                    headers=safe_headers
                )
            else:
                return Response(
                    content=response.content,
                    status_code=response.status_code,
                    media_type=content_type or None,
                    headers=safe_headers
                )
        except Exception:
            # JSON 파싱 실패 시 텍스트로 감싸서 전달
            return JSONResponse(
                content={"detail": response.text},
                status_code=response.status_code,
                headers=safe_headers
            )


@gateway_router.get("/health", summary="게이트웨이 헬스체크")
async def health_check():
    return {
        "status": "healthy",
        "service": "gateway",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "version": "0.1.0",
    }


# ---------- Proxy ----------
@gateway_router.get("/{service}/{path:path}", summary="GET 프록시")
async def proxy_get(service: ServiceType, path: str, request: Request):
    try:
        factory = ServiceDiscovery(service_type=service)
        headers = dict(request.headers)
        params = dict(request.query_params)
        resp = await factory.request(
            method="GET",
            path=path,
            headers=headers,
            params=params,
        )
        return ResponseFactory.create_response(resp)
    except HTTPException as he:
        return JSONResponse(content={"detail": he.detail}, status_code=he.status_code)
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
        logger.info("🚀 === Gateway POST 요청 시작 ===")
        logger.info(f"📅 요청 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"🎯 서비스: {service}")
        logger.info(f"📍 경로: {path}")
        logger.info(f"🌐 클라이언트: {request.client.host}")
        logger.info(f"📋 User-Agent: {request.headers.get('user-agent', 'N/A')}")

        if file:
            logger.info(f"📁 파일명: {file.filename}, 시트 이름: {sheet_names if sheet_names else '없음'}")

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

            # Auth 서비스 요청에 대한 상세 로깅(민감정보 마스킹)
            if service == ServiceType.auth:
                try:
                    body_json = json.loads(body.decode("utf-8")) if body else {}
                    if path == "login":
                        logger.info("=== 로그인 Alert 데이터 (Gateway Generic Proxy) ===")
                        logger.info(f"Auth ID: {body_json.get('auth_id')}")
                        pw = body_json.get("auth_pw")
                        masked_pw = "*" * len(pw) if isinstance(pw, str) else None
                        logger.info(f"Auth PW: {masked_pw}")
                        logger.info("=== Alert 데이터 끝 (Gateway Generic Proxy) ===")
                    elif path == "signup":
                        logger.info("=== 회원가입 Alert 데이터 (Gateway Generic Proxy) ===")
                        logger.info(f"ID: {body_json.get('id')}")
                        logger.info(f"Company ID: {body_json.get('company_id')}")
                        logger.info(f"Industry: {body_json.get('industry')}")
                        logger.info(f"Email: {body_json.get('email')}")
                        logger.info(f"Name: {body_json.get('name')}")
                        logger.info(f"Age: {body_json.get('age')}")
                        logger.info(f"Auth ID: {body_json.get('auth_id')}")
                        pw = body_json.get("auth_pw")
                        masked_pw = "*" * len(pw) if isinstance(pw, str) else None
                        logger.info(f"Auth PW: {masked_pw}")
                        logger.info("=== Alert 데이터 끝 (Gateway Generic Proxy) ===")
                except Exception as e:
                    logger.warning(f"Auth 서비스 요청 로깅 중 오류: {e}")

        logger.info(f"🔗 {service} 서비스로 요청 전달 중...")
        resp = await factory.request(
            method="POST",
            path=path,
            headers=headers,
            body=body,
            files=files,
            params=params,
            data=data,
        )
        logger.info(f"✅ {service} 서비스 응답 수신 완료")
        logger.info("🚀 === Gateway POST 요청 완료 ===")
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
    except HTTPException as he:
        return JSONResponse(content={"detail": he.detail}, status_code=he.status_code)
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
    except HTTPException as he:
        return JSONResponse(content={"detail": he.detail}, status_code=he.status_code)
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
    except HTTPException as he:
        return JSONResponse(content={"detail": he.detail}, status_code=he.status_code)
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
        "docs": "/docs",
    }

# 라우터를 앱에 포함 (generic proxy만 사용)
app.include_router(gateway_router)

# ✅ uvicorn 실행 경로 단순화
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)