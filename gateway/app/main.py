"""
gateway-router 메인 파일 (정리본)
"""
from typing import Optional, List, Dict, Any
import os
import sys
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import (
    APIRouter, FastAPI, Request, UploadFile, Query, HTTPException, Body
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

from dotenv import load_dotenv
from app.domain.model.service_factory import ServiceProxyFactory, ServiceType

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
is_railway = os.getenv("RAILWAY_ENVIRONMENT") in ["true", "production"]

# 환경변수 디버깅 로깅 추가
logger.info("🔍 === Gateway 환경변수 상태 ===")
logger.info(f"RAILWAY_ENVIRONMENT: {os.getenv('RAILWAY_ENVIRONMENT')}")
logger.info(f"PORT: {os.getenv('PORT', '8080')}")
logger.info(f"SERVICE_NAME: {os.getenv('SERVICE_NAME', 'gateway')}")
logger.info(f"AUTH_SERVICE_URL: {os.getenv('AUTH_SERVICE_URL', 'http://localhost:8008')}")
logger.info(f"is_railway: {is_railway}")
logger.info("🔍 === 환경변수 상태 끝 ===")

if is_railway:
    # Railway 프로덕션 환경
    cors_origins = [
        "https://taeheonai.com",
        "https://www.taeheonai.com",
        "https://taeheonai-9df6jy61w-oheth9-gmailcoms-projects.vercel.app",
        "https://taeheonai-oheth9-gmailcoms-projects.vercel.app",
        "https://taeheonai-git-main-oheth9-gmailcoms-projects.vercel.app",  # 현재 Vercel 도메인 추가
        "https://taeheonai-production-2130.up.railway.app",
        "https://gri-service-production.up.railway.app",
        "https://disciplined-imagination-production-df5c.up.railway.app",
        # 🚨 개발 중 Vercel 도메인 와일드카드 허용
        "https://*.vercel.app"  # 모든 Vercel 도메인 허용
    ]
    logger.info("🌐 Railway 프로덕션 환경 CORS 설정 적용")
else:
    # 로컬 개발 환경
    cors_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://frontend:3000"
    ]
    logger.info("💻 로컬 개발 환경 CORS 설정 적용")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CORS 요청 로깅을 위한 미들웨어 추가
@app.middleware("http")
async def log_cors_requests(request: Request, call_next):
    origin = request.headers.get("origin")
    logger.info(f"🌐 CORS 요청 감지: {request.method} {request.url.path} from {origin}")
    
    if origin:
        if origin in cors_origins:
            logger.info(f"✅ CORS 허용된 origin: {origin}")
        else:
            logger.warning(f"⚠️ CORS 허용되지 않은 origin: {origin}")
    
    response = await call_next(request)
    return response

gateway_router = APIRouter(prefix="/api/v1", tags=["Gateway API"])

# 파일필수 서비스(없다면 빈 세트 유지)
FILE_REQUIRED_SERVICES: set[str] = set()


# ServiceType과 ServiceDiscovery 클래스는 service_factory.py로 이동됨


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
        factory = ServiceProxyFactory(service_type=service)
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


@gateway_router.post("/{service}/{path:path}", summary="POST 프록시 (JSON 전용)")
async def proxy_post_json(
    service: ServiceType,
    path: str,
    request: Request,
    # ✅ JSON 전용 바디 선언 → Swagger에 JSON 에디터 표시
    payload: Dict[str, Any] = Body(
        ...,  # required
        example={"auth_id": "test@example.com", "auth_pw": "****"}
    ),
):
    logger.info(f"🚀 POST 프록시(JSON) 시작: service={service}, path={path}")
    logger.info(f"🚀 요청 URL: {request.url}")
    logger.info(f"🔍 받은 payload: {payload}")

    try:
        factory = ServiceProxyFactory(service_type=service)
        headers = dict(request.headers)
        headers["content-type"] = "application/json"
        
        # Content-Length 헤더 제거 (자동 계산되도록)
        if "content-length" in headers:
            del headers["content-length"]
        
        # payload를 JSON 문자열로 변환하여 body 생성
        body = json.dumps(payload).encode('utf-8')
        
        # Auth 서비스 요청에 대한 상세 로깅(민감정보 마스킹)
        if service == ServiceType.auth:
            logger.info(f"🔍 === Auth 서비스 요청 로깅 시작 ===")
            logger.info(f"🔍 Payload 타입: {type(payload)}")
            logger.info(f"🔍 Payload 내용: {payload}")
            logger.info(f"🔍 Body 길이: {len(body)} bytes")
            
            try:
                if path == "login":
                    logger.info("=== 로그인 Alert 데이터 (Gateway Generic Proxy) ===")
                    logger.info(f"Auth ID: {payload.get('auth_id')}")
                    pw = payload.get("auth_pw")
                    masked_pw = "*" * len(pw) if isinstance(pw, str) else None
                    logger.info(f"Auth PW: {masked_pw}")
                    logger.info("=== Alert 데이터 끝 (Gateway Generic Proxy) ===")
                elif path == "signup":
                    logger.info("=== 회원가입 Alert 데이터 (Gateway Generic Proxy) ===")
                    logger.info(f"ID: {payload.get('id')}")
                    logger.info(f"Company ID: {payload.get('company_id')}")
                    logger.info(f"Industry: {payload.get('industry')}")
                    logger.info(f"Email: {payload.get('email')}")
                    logger.info(f"Name: {payload.get('name')}")
                    logger.info(f"Age: {payload.get('age')}")
                    logger.info(f"Auth ID: {payload.get('auth_id')}")
                    pw = payload.get("auth_pw")
                    masked_pw = "*" * len(pw) if isinstance(pw, str) else None
                    logger.info(f"Auth PW: {masked_pw}")
                    logger.info("=== Alert 데이터 끝 (Gateway Generic Proxy) ===")
                    
            except Exception as e:
                logger.error(f"❌ Auth 서비스 요청 로깅 중 예외 발생: {e}")
                logger.error(f"❌ Exception type: {type(e)}")
                import traceback
                logger.error(f"❌ Traceback: {traceback.format_exc()}")
            
            logger.info(f"🔍 === Auth 서비스 요청 로깅 끝 ===")

        logger.info(f"🔗 {service} 서비스로 요청 전달 중...")
        logger.info(f"🔍 요청 경로: {path}")
        logger.info(f"🔍 변환된 경로: {factory.upstream_path(path)}")
        logger.info(f"🔍 최종 URL: {factory.base_urls.get(service)}{factory.upstream_path(path)}")
        
        resp = await factory.request(
            method="POST",
            path=path,
            headers=headers,
            body=body,
            files=None,
            params=None,
            data=None,
        )
        
        logger.info(f"✅ {service} 서비스 응답 수신 완료")
        logger.info("🚀 === Gateway POST 요청 완료 ===")
        return ResponseFactory.create_response(resp)

    except HTTPException as he:
        return JSONResponse(content={"detail": he.detail}, status_code=he.status_code)
    except Exception as e:
        logger.error(f"🚨 POST(JSON) 처리 중 오류: {e}", exc_info=True)
        return JSONResponse(
            content={"detail": f"Gateway error: {str(e)}", "error_type": type(e).__name__},
            status_code=500
        )


@gateway_router.put("/{service}/{path:path}", summary="PUT 프록시")
async def proxy_put(service: ServiceType, path: str, request: Request):
    try:
        factory = ServiceProxyFactory(service_type=service)
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
        factory = ServiceProxyFactory(service_type=service)
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
        factory = ServiceProxyFactory(service_type=service)
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

# 모든 요청 로깅 미들웨어 추가
@app.middleware("http")
async def log_all_requests(request: Request, call_next):
    start_time = datetime.now()
    client_host = request.client.host if request.client else "unknown"
    
    logger.info(f"🌐 === Gateway 요청 수신 ===")
    logger.info(f"📅 시간: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"🌐 클라이언트: {client_host}")
    logger.info(f"📋 메서드: {request.method}")
    logger.info(f"📍 경로: {request.url.path}")
    logger.info(f"🔗 전체 URL: {request.url}")
    logger.info(f"📋 User-Agent: {request.headers.get('user-agent', 'N/A')}")
    logger.info(f"🌐 === 요청 로깅 끝 ===")
    
    try:
        response = await call_next(request)
        process_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"✅ 응답 완료: {response.status_code} ({process_time:.3f}s)")
        return response
    except Exception as e:
        logger.error(f"❌ 요청 처리 중 오류: {str(e)}")
        raise

# ✅ uvicorn 실행 경로 단순화
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)