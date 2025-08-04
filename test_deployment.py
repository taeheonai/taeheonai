#!/usr/bin/env python3
"""
배포 테스트 스크립트
Railway 배포 후 서비스들이 정상적으로 작동하는지 확인
"""

import requests
import time
import sys
from typing import Dict, List

def test_health_endpoint(url: str, service_name: str) -> bool:
    """헬스체크 엔드포인트 테스트"""
    try:
        response = requests.get(f"{url}/health", timeout=10)
        if response.status_code == 200:
            print(f"✅ {service_name} health check passed")
            return True
        else:
            print(f"❌ {service_name} health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ {service_name} health check error: {e}")
        return False

def test_root_endpoint(url: str, service_name: str) -> bool:
    """루트 엔드포인트 테스트"""
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            print(f"✅ {service_name} root endpoint working")
            return True
        else:
            print(f"❌ {service_name} root endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ {service_name} root endpoint error: {e}")
        return False

def main():
    """메인 테스트 함수"""
    print("🚀 배포 테스트 시작...")
    
    # 테스트할 서비스들 (Railway URL로 변경 필요)
    services = {
        "gateway": "http://localhost:8000",  # 로컬 테스트용
        "auth-service": "http://localhost:8002"  # 로컬 테스트용
    }
    
    print("\n📋 서비스 헬스체크 테스트:")
    health_results = {}
    for service_name, url in services.items():
        health_results[service_name] = test_health_endpoint(url, service_name)
    
    print("\n📋 서비스 루트 엔드포인트 테스트:")
    root_results = {}
    for service_name, url in services.items():
        root_results[service_name] = test_root_endpoint(url, service_name)
    
    print("\n📊 테스트 결과 요약:")
    all_passed = True
    for service_name in services.keys():
        health_ok = health_results.get(service_name, False)
        root_ok = root_results.get(service_name, False)
        
        if health_ok and root_ok:
            print(f"✅ {service_name}: 모든 테스트 통과")
        else:
            print(f"❌ {service_name}: 일부 테스트 실패")
            all_passed = False
    
    if all_passed:
        print("\n🎉 모든 서비스가 정상적으로 작동합니다!")
        return 0
    else:
        print("\n⚠️ 일부 서비스에 문제가 있습니다.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 