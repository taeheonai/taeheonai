#!/usr/bin/env python3
"""
ServiceProxyFactory 테스트 스크립트
"""

import asyncio
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.domain.model.service_factory import ServiceProxyFactory, ServiceType

async def test_service_factory():
    """ServiceProxyFactory 테스트"""
    print("🧪 ServiceProxyFactory 테스트 시작")
    
    # Auth 서비스 테스트
    auth_factory = ServiceProxyFactory(ServiceType.auth)
    print(f"✅ Auth 서비스 URL: {auth_factory.base_urls[ServiceType.auth]}")
    
    # 경로 변환 테스트
    test_paths = [
        "/login",
        "/signup", 
        "/api/v1/auth/login",
        "/v1/auth/login"
    ]
    
    for path in test_paths:
        converted = auth_factory.upstream_path(path)
        print(f"🔄 경로 변환: {path} → {converted}")
    
    # 다른 서비스들도 테스트
    for service_type in ServiceType:
        if service_type != ServiceType.auth:
            factory = ServiceProxyFactory(service_type)
            print(f"✅ {service_type.value} 서비스 URL: {factory.base_urls[service_type]}")
    
    print("🎉 테스트 완료!")

if __name__ == "__main__":
    asyncio.run(test_service_factory())
