"""
gateway-router 메인 파일 (정리본)
"""
from typing import Optional, List
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
        "http://taeheonai.com",
        "https://www.taeheonai.com",
        "http://www.taeheonai.com"
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


@gateway_router.post("/{service}/{path:path}", summary="POST 프록시")
async def proxy_post(
    service: ServiceType,
    path: str,
    request: Request,
    file: Optional[UploadFile] = None,
    sheet_names: Optional[List[str]] = Query(None, alias="sheet_name"),
    body_data: Optional[dict] = None,  # Swagger에서 JSON 입력을 위한 파라미터
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

        factory = ServiceProxyFactory(service_type=service)
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
            # Swagger에서 전달된 body_data가 있으면 우선 사용, 없으면 request.body() 사용
            if body_data is not None:
                logger.info(f"🔍 === Swagger에서 전달된 body_data 사용 ===")
                body_json = body_data
                body = json.dumps(body_data).encode('utf-8')
            else:
                body = await request.body()
                body_json = None
            
            # Auth 서비스 요청에 대한 상세 로깅(민감정보 마스킹)
            if service == ServiceType.auth:
                logger.info(f"🔍 === Auth 서비스 요청 로깅 시작 ===")
                logger.info(f"🔍 Body 타입: {type(body)}")
                logger.info(f"🔍 Body 길이: {len(body) if body else 0}")
                logger.info(f"🔍 Body 내용 (raw): {body}")
                
                try:
                    if body_data is not None:
                        # Swagger에서 전달된 데이터 사용
                        body_json = body_data
                        logger.info(f"🔍 Swagger body_data: {body_json}")
                    elif body:
                        # request.body()에서 파싱
                        body_str = body.decode("utf-8")
                        logger.info(f"🔍 Decoded body: {body_str}")
                        body_json = json.loads(body_str)
                        logger.info(f"🔍 Parsed JSON: {body_json}")
                    else:
                        body_json = {}
                        logger.warning("⚠️ Body가 비어있음")
                    
                    # 로깅 처리
                    if body_json:
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
                        
                except json.JSONDecodeError as e:
                    logger.error(f"❌ JSON 파싱 실패: {e}")
                    logger.error(f"❌ Raw body: {body}")
                except UnicodeDecodeError as e:
                    logger.error(f"❌ UTF-8 디코딩 실패: {e}")
                    logger.error(f"❌ Raw body: {body}")
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