from typing import Optional
from enum import Enum
import os
import logging
from fastapi import HTTPException
import httpx

logger = logging.getLogger("gateway_api")


class ServiceType(str, Enum):
    chatbot = "chatbot"
    gri = "gri"
    materiality = "materiality"
    tcfd = "tcfd"
    grireport = "grireport"
    tcfdreport = "tcfdreport"
    auth = "auth"


class ServiceProxyFactory:
    def __init__(self, service_type: ServiceType):
        self.service_type = service_type
        
        # Railway 프로덕션 환경 URL 설정 (기본값)
        self.base_urls = {
            ServiceType.chatbot: os.getenv("CHATBOT_SERVICE_URL", "https://disciplined-imagination-production-df5c.up.railway.app"),
            ServiceType.gri: os.getenv("GRI_SERVICE_URL", "https://disciplined-imagination-production-df5c.up.railway.app"),
            ServiceType.materiality: os.getenv("MATERIALITY_SERVICE_URL", "https://disciplined-imagination-production-df5c.up.railway.app"),
            ServiceType.tcfd: os.getenv("TCFD_SERVICE_URL", "https://disciplined-imagination-production-df5c.up.railway.app"),
            ServiceType.grireport: os.getenv("GRIREPORT_SERVICE_URL", "https://disciplined-imagination-production-df5c.up.railway.app"),
            ServiceType.tcfdreport: os.getenv("TCFDREPORT_SERVICE_URL", "https://disciplined-imagination-production-df5c.up.railway.app"),
            ServiceType.auth: os.getenv("AUTH_SERVICE_URL", "https://disciplined-imagination-production-df5c.up.railway.app"),
        }
        
        # Railway 환경 감지
        self.is_railway = os.getenv("RAILWAY_ENVIRONMENT") in ["true", "production"]
        if self.is_railway:
            logger.info(f"🌐 Railway 환경에서 {service_type} 서비스 연결 시도")
        else:
            logger.info(f"💻 로컬 환경에서 {service_type} 서비스 연결 시도")
        
        logger.info(f"👩🏻 Service URL: {self.base_urls.get(service_type)}")

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
        
        # auth 서비스의 경우 /login → /v1/auth/login으로 변환
        if self.service_type == ServiceType.auth and path == "/login":
            return "/v1/auth/login"
        
        return f"{prefix}{path}"

    async def request(
        self,
        method: str,
        path: str,
        headers: Optional[dict] = None,
        body: Optional[bytes] = None,
        files: Optional[dict] = None,
        params: Optional[dict] = None,
        data: Optional[dict] = None,
    ) -> httpx.Response:
        base_url = self.base_urls.get(self.service_type)
        if not base_url:
            raise HTTPException(status_code=404, detail=f"Service {self.service_type} not found")

        full_path = self.upstream_path(path)  # ✅ 접두사 포함 경로
        url = f"{base_url}{full_path}"
        
        print(f"🎯🎯🎯 Requesting URL: {url}")
        logger.info(f"🎯 Requesting URL: {url}")

        # 업스트림에 보낼 헤더 정리
        fwd_headers = dict(headers or {})
        fwd_headers.pop("host", None)  # ✅ Host 제거
        
        # 기본 헤더 설정
        if not fwd_headers.get('Content-Type'):
            fwd_headers['Content-Type'] = 'application/json'
        if not fwd_headers.get('Accept'):
            fwd_headers['Accept'] = 'application/json'

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
                            import json
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
                
                print(f"Response status: {response.status_code}")
                print(f"Request URL: {url}")
                print(f"Request body: {body}")
                logger.info(f"✅ Response status: {response.status_code}")
                
                return response
            except httpx.RequestError as e:
                logger.error(f"Request error: {e}")
                raise HTTPException(status_code=503, detail=f"Service {self.service_type} unavailable")
            except Exception as e:
                print(f"Request failed: {str(e)}")
                logger.error(f"Request failed: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
