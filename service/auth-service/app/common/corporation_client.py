import httpx
import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class CorporationClient:
    """기업 정보 서비스와 통신하는 클라이언트"""
    
    def __init__(self, base_url: str = "http://localhost:8009"):
        self.base_url = base_url.rstrip('/')
        self.client = httpx.AsyncClient(timeout=10.0)
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    async def validate_corporation_exists(self, corporation_id: int) -> bool:
        """기업 ID가 유효한지 검증"""
        try:
            url = f"{self.base_url}/v1/corporations/validate/{corporation_id}"
            response = await self.client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                return data.get("valid", False)
            elif response.status_code == 404:
                return False
            else:
                logger.error(f"기업 ID 검증 실패: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"기업 ID 검증 중 오류 발생: {e}")
            return False
    
    async def get_corporation_by_id(self, corporation_id: int) -> Optional[Dict[str, Any]]:
        """ID로 기업 정보 조회"""
        try:
            url = f"{self.base_url}/v1/corporations/{corporation_id}"
            response = await self.client.get(url)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                return None
            else:
                logger.error(f"기업 정보 조회 실패: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"기업 정보 조회 중 오류 발생: {e}")
            return None
    
    async def get_corporation_by_code(self, corp_code: str) -> Optional[Dict[str, Any]]:
        """기업 코드로 기업 정보 조회"""
        try:
            url = f"{self.base_url}/v1/corporations/code/{corp_code}"
            response = await self.client.get(url)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                return None
            else:
                logger.error(f"기업 코드로 조회 실패: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"기업 코드로 조회 중 오류 발생: {e}")
            return None
    
    async def get_all_corporations(self, skip: int = 0, limit: int = 100) -> Optional[Dict[str, Any]]:
        """모든 기업 정보 조회 (회원가입 시 드롭다운용)"""
        try:
            url = f"{self.base_url}/v1/corporations?skip={skip}&limit={limit}"
            response = await self.client.get(url)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"기업 목록 조회 실패: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"기업 목록 조회 중 오류 발생: {e}")
            return None
