"""
gateway-router 메인 파일 (정리본 / fixed)
"""
from typing import Dict, Any
import os
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import APIRouter, FastAPI, Request, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# ─────────────────────────────────────────────────────────────────────────────
# 0) 로깅 부트스트랩: logger를 가장 먼저 정의
# ─────────────────────────────────────────────────────────────────────────────
logger = logging.getLogger("gateway")
logger.setLevel(logging.INFO)
if not logger.handlers:
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s"))
    logger.addHandler(_h)

logger.info("🚀 Gateway 서비스 시작 준비...")

# ─────────────────────────────────────────────────────────────────────────────
# 1) 환경 변수 로드 및 플래그
# ─────────────────────────────────────────────────────────────────────────────
load_dotenv()

ENV = os.getenv("ENVIRONMENT", "development").lower()
IS_PROD = ENV == "production"
IS_RAILWAY = os.getenv("RAILWAY_ENVIRONMENT", "").lower() in ("true", "production")

# ─────────────────────────────────────────────────────────────────────────────
# 2) CORS Origin 정의 (정확 매칭 + 필요 시 regex)
#   - allow_credentials=True 상황에선 "*" 금지
#   - *.vercel.app / *.railway.app 는 allow_origin_regex로 처리
# ─────────────────────────────────────────────────────────────────────────────
if IS_PROD or IS_RAILWAY:
    ALLOW_ORIGINS = [
        "https://taeheonai.com",
        "https://www.taeheonai.com",
    ]
    # vercel/railway 서브도메인을 모두 허용해야 할 때만 사용
    ALLOW_ORIGIN_REGEX = r"^https://([a-z0-9-]+\.)?(vercel\.app|railway\.app)$"
else:
    ALLOW_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ]
    ALLOW_ORIGIN_REGEX = None

logger.info(f"🌐 ENV={ENV}, IS_PROD={IS_PROD}, IS_RAILWAY={IS_RAILWAY}")
logger.info(f"🌐 CORS allow_origins={ALLOW_ORIGINS}")
logger.info(f"🌐 CORS allow_origin_regex={ALLOW_ORIGIN_REGEX}")

# ─────────────────────────────────────────────────────────────────────────────
# 3) Proxy 스킴 교정 (X-Forwarded-Proto)
# ─────────────────────────────────────────────────────────────────────────────
from starlette.datastructures import Headers

class XForwardedProtoMiddleware:
    def __init__(self, app, header: str = "x-forwarded-proto"):
        self.app = app
        self.header = header
    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            proto = Headers(scope=scope).get(self.header)
            if proto in ("http", "https"):
                scope["scheme"] = proto
        await self.app(scope, receive, send)

# ProxyHeadersMiddleware: Starlette 버전 차이 대응
try:
    from starlette.middleware import ProxyHeadersMiddleware
    HAVE_PROXY_HEADERS = True
    logger.info("✅ ProxyHeadersMiddleware 사용 가능")
except Exception:
    HAVE_PROXY_HEADERS = False
    logger.info("ℹ️ ProxyHeadersMiddleware 미탑재 → XForwardedProtoMiddleware로 대체")

# ─────────────────────────────────────────────────────────────────────────────
# 4) 앱 생성 + lifespan
# ─────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Gateway API 서비스 시작")
    yield
    logger.info("🛑 Gateway API 서비스 종료")

app = FastAPI(
    title="Gateway API",
    description="Gateway API for taeheonai.com",
    version="0.1.0",
    docs_url="/docs",
    lifespan=lifespan,
)

# (선택) 호스트 제한: 운영에서만 엄격 적용하고, 개발은 완화
if IS_PROD:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["taeheonai.com", "www.taeheonai.com", "*.vercel.app", "*.railway.app"])
else:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# 4-1) 프록시 스킴 교정 → CORS 순서
if HAVE_PROXY_HEADERS:
    app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")
    logger.info("✅ ProxyHeadersMiddleware 추가됨 (프록시 헤더 신뢰)")
else:
    app.add_middleware(XForwardedProtoMiddleware)
    logger.info("✅ XForwardedProtoMiddleware 추가됨 (수동 스킴 교정)")

logger.info("🔒 미들웨어 순서: 프록시 스킴 교정 → CORS (CORS가 가장 바깥)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_origin_regex=ALLOW_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
logger.info("✅ CORS 미들웨어 적용 완료")
logger.info(f"🔒 CORS 보안: allow_credentials=True, 프리플라이트 가드 활성화")
logger.info(f"🌐 CORS Origins: {ALLOW_ORIGINS}")
if ALLOW_ORIGIN_REGEX:
    logger.info(f"🔒 CORS Regex: {ALLOW_ORIGIN_REGEX}")

# ─────────────────────────────────────────────────────────────────────────────
# 5) 서비스 프록시
# ─────────────────────────────────────────────────────────────────────────────
from app.domain.model.service_factory import ServiceProxyFactory, ServiceType

# ✅ 프리플라이트 가드: 게이트웨이가 OPTIONS를 200으로 '종단 응답'
from starlette.responses import Response

@app.options("/{path:path}")
def _cors_preflight_guard():
    """CORS 프리플라이트 요청을 게이트웨이에서 확실히 종단 처리"""
    logger.info("🔄 CORS 프리플라이트 가드 동작: OPTIONS 요청 차단")
    return Response(status_code=200)

gateway_router = APIRouter(prefix="/api/v1", tags=["Gateway API"])

class ResponseFactory:
    @staticmethod
    def create_response(response):
        unsafe_headers = {"content-length", "transfer-encoding", "content-encoding", "connection", "date", "server"}
        safe_headers = {k: v for k, v in response.headers.items() if k.lower() not in unsafe_headers}
        content_type = response.headers.get("content-type", "")
        try:
            if content_type.startswith("application/json"):
                return JSONResponse(content=response.json(), status_code=response.status_code, headers=safe_headers)
            return Response(content=response.content, status_code=response.status_code, media_type=content_type or None, headers=safe_headers)
        except Exception:
            return JSONResponse(content={"detail": response.text}, status_code=response.status_code, headers=safe_headers)

@gateway_router.get("/health", summary="게이트웨이 헬스체크")
async def health_check():
    return {"status": "healthy", "service": "gateway", "timestamp": datetime.utcnow().isoformat() + "Z", "version": "0.1.0"}

# ✅ /api/v1/{service} 형태 지원 (예: /api/v1/corporation)
@gateway_router.get("/{service}", summary="GET 프록시 (root)")
async def proxy_get_root(service: ServiceType, request: Request):
    try:
        factory = ServiceProxyFactory(service_type=service)
        resp = await factory.request(
            method="GET",
            path="",  # ← 빈 path로 업스트림 접두사만 붙여 /v1/{service}
            headers=dict(request.headers),
            params=dict(request.query_params),
        )
        return ResponseFactory.create_response(resp)
    except HTTPException as he:
        return JSONResponse(content={"detail": he.detail}, status_code=he.status_code)
    except Exception as e:
        logger.error(f"Error in GET proxy (root): {e}", exc_info=True)
        return JSONResponse(content={"detail": f"Error processing request: {e}"}, status_code=500)

# ✅ /api/v1/{service}/ 형태 지원 (예: /api/v1/corporation/)
@gateway_router.get("/{service}/", summary="GET 프록시 (root with slash)")
async def proxy_get_root_slash(service: ServiceType, request: Request):
    try:
        factory = ServiceProxyFactory(service_type=service)
        resp = await factory.request(
            method="GET",
            path="",  # ← 빈 path로 업스트림 접두사만 붙여 /v1/{service}
            headers=dict(request.headers),
            params=dict(request.query_params),
        )
        return ResponseFactory.create_response(resp)
    except HTTPException as he:
        return JSONResponse(content={"detail": he.detail}, status_code=he.status_code)
    except Exception as e:
        logger.error(f"Error in GET proxy (root with slash): {e}", exc_info=True)
        return JSONResponse(content={"detail": f"Error processing request: {e}"}, status_code=500)

@gateway_router.get("/{service}/{path:path}", summary="GET 프록시")
async def proxy_get(service: ServiceType, path: str, request: Request):
    try:
        factory = ServiceProxyFactory(service_type=service)
        resp = await factory.request(method="GET", path=path, headers=dict(request.headers), params=dict(request.query_params))
        return ResponseFactory.create_response(resp)
    except HTTPException as he:
        return JSONResponse(content={"detail": he.detail}, status_code=he.status_code)
    except Exception as e:
        logger.error(f"Error in GET proxy: {e}", exc_info=True)
        return JSONResponse(content={"detail": f"Error processing request: {e}"}, status_code=500)

@gateway_router.post("/{service}/{path:path}", summary="POST 프록시 (JSON 전용)")
async def proxy_post_json(service: ServiceType, path: str, request: Request, payload: Dict[str, Any] = Body(...)):
    try:
        factory = ServiceProxyFactory(service_type=service)
        headers = dict(request.headers)
        headers["content-type"] = "application/json"
        headers.pop("content-length", None)  # 자동 계산
        body = json.dumps(payload).encode("utf-8")
        resp = await factory.request(method="POST", path=path, headers=headers, body=body, files=None, params=None, data=None)
        return ResponseFactory.create_response(resp)
    except HTTPException as he:
        return JSONResponse(content={"detail": he.detail}, status_code=he.status_code)
    except Exception as e:
        logger.error(f"Error in POST proxy: {e}", exc_info=True)
        return JSONResponse(content={"detail": f"Gateway error: {e}", "error_type": type(e).__name__}, status_code=500)

@gateway_router.put("/{service}/{path:path}", summary="PUT 프록시")
async def proxy_put(service: ServiceType, path: str, request: Request):
    try:
        factory = ServiceProxyFactory(service_type=service)
        resp = await factory.request(method="PUT", path=path, headers=dict(request.headers), body=await request.body(), params=dict(request.query_params))
        return ResponseFactory.create_response(resp)
    except HTTPException as he:
        return JSONResponse(content={"detail": he.detail}, status_code=he.status_code)
    except Exception as e:
        logger.error(f"Error in PUT proxy: {e}", exc_info=True)
        return JSONResponse(content={"detail": f"Error processing request: {e}"}, status_code=500)

@gateway_router.delete("/{service}/{path:path}", summary="DELETE 프록시")
async def proxy_delete(service: ServiceType, path: str, request: Request):
    try:
        factory = ServiceProxyFactory(service_type=service)
        resp = await factory.request(method="DELETE", path=path, headers=dict(request.headers), params=dict(request.query_params))
        return ResponseFactory.create_response(resp)
    except HTTPException as he:
        return JSONResponse(content={"detail": he.detail}, status_code=he.status_code)
    except Exception as e:
        logger.error(f"Error in DELETE proxy: {e}", exc_info=True)
        return JSONResponse(content={"detail": f"Error processing request: {e}"}, status_code=500)

@gateway_router.patch("/{service}/{path:path}", summary="PATCH 프록시")
async def proxy_patch(service: ServiceType, path: str, request: Request):
    try:
        factory = ServiceProxyFactory(service_type=service)
        resp = await factory.request(method="PATCH", path=path, headers=dict(request.headers), body=await request.body(), params=dict(request.query_params))
        return ResponseFactory.create_response(resp)
    except HTTPException as he:
        return JSONResponse(content={"detail": he.detail}, status_code=he.status_code)
    except Exception as e:
        logger.error(f"Error in PATCH proxy: {e}", exc_info=True)
        return JSONResponse(content={"detail": f"Error processing request: {e}"}, status_code=500)

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(content={"detail": "Service not found"}, status_code=404)

@app.get("/")
async def root():
    return {"message": "Gateway API", "version": "0.1.0", "docs": "/docs"}

app.include_router(gateway_router)

# ─────────────────────────────────────────────────────────────────────────────
# 6) 개발 실행용 엔트리포인트 (Railway는 Start Command 사용)
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        reload=not IS_PROD,
        proxy_headers=True,
        forwarded_allow_ips="*",
    )
