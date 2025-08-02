from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import logging
from datetime import datetime
from typing import Dict, Optional

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TaeheonAI API Gateway",
    description="Microservice Architecture API Gateway",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 서비스 디스커버리 클래스
class ServiceDiscovery:
    def __init__(self):
        self.services: Dict[str, Dict] = {}
    
    async def register_service(self, name: str, url: str, health_url: str = None):
        """서비스 등록"""
        if health_url is None:
            health_url = f"{url}/health"
        
        self.services[name] = {
            "name": name,
            "url": url,
            "health_url": health_url,
            "status": "registered",
            "registered_at": datetime.now()
        }
        logger.info(f"📝 Registered service: {name} at {url}")
    
    async def get_service(self, name: str) -> Optional[Dict]:
        """서비스 정보 조회"""
        return self.services.get(name)
    
    async def get_all_services(self) -> Dict[str, Dict]:
        """모든 서비스 정보 조회"""
        return self.services.copy()

# 서비스 디스커버리 인스턴스
service_discovery = ServiceDiscovery()

# 프록시 서비스 클래스
class ProxyService:
    def __init__(self, service_discovery: ServiceDiscovery):
        self.service_discovery = service_discovery
    
    async def forward_request(self, service_name: str, request: Request, path: str):
        """요청을 해당 서비스로 프록시"""
        service = await self.service_discovery.get_service(service_name)
        if not service:
            raise HTTPException(status_code=404, detail=f"Service {service_name} not found")
        
        # 요청 본문 읽기
        body = await request.body()
        
        # 헤더 준비
        headers = dict(request.headers)
        headers.pop("host", None)  # host 헤더 제거
        
        # 프록시 요청 생성
        target_url = f"{service['url']}{path}"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.request(
                    method=request.method,
                    url=target_url,
                    headers=headers,
                    content=body,
                    params=request.query_params,
                    timeout=30.0
                )
                
                # 응답 반환
                return JSONResponse(
                    content=response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text,
                    status_code=response.status_code,
                    headers=dict(response.headers)
                )
                
        except Exception as e:
            logger.error(f"❌ Proxy error for {service_name}: {e}")
            raise HTTPException(status_code=502, detail=f"Service {service_name} error")

# 프록시 서비스 인스턴스
proxy_service = ProxyService(service_discovery)

@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 실행"""
    logger.info("🚀 API Gateway starting up...")
    logger.info("✅ API Gateway started successfully")

# 메인 라우터 - 서비스 디스커버리 및 프록시
@app.api_route("/{service_name}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_route(service_name: str, path: str, request: Request):
    """동적 라우팅 - 모든 서비스 요청을 해당 서비스로 프록시"""
    logger.info(f"🔄 Proxying request to {service_name}/{path}")
    return await proxy_service.forward_request(service_name, request, f"/{path}")

# Gateway 헬스 체크
@app.get("/health")
async def health_check():
    """Gateway 헬스 체크"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "gateway": "TaeheonAI API Gateway",
        "version": "1.0.0"
    }

# 서비스 레지스트리 조회
@app.get("/services")
async def get_services():
    """등록된 서비스 목록 조회"""
    services = await service_discovery.get_all_services()
    
    return {
        "services": services,
        "stats": {
            "total": len(services),
            "registered": len(services)
        }
    }

# 서비스 등록
@app.post("/register")
async def register_service(request: Request):
    """새로운 서비스 등록"""
    data = await request.json()
    
    await service_discovery.register_service(
        data["name"],
        data["url"],
        data.get("health_url")
    )
    
    return {
        "message": f"Service {data['name']} registered successfully",
        "service_name": data["name"],
        "status": "registered"
    }

# 통계 정보
@app.get("/stats")
async def get_stats():
    """서비스 통계 정보"""
    services = await service_discovery.get_all_services()
    
    return {
        "total_services": len(services),
        "registered_services": len(services),
        "uptime": "running",
        "timestamp": datetime.now().isoformat()
    }

# 루트 엔드포인트
@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "TaeheonAI API Gateway",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "services": "/services",
            "register": "/register",
            "stats": "/stats",
            "proxy": "/{service_name}/{path:path}"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) 