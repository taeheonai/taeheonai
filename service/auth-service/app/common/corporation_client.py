import os
import httpx
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class CorporationClient:
    """기업 정보 서비스와 통신하는 클라이언트"""

    def __init__(self, base_url: Optional[str] = None):
        # 게이트웨이를 우선 사용
        gw = os.getenv("GATEWAY_URL", "https://taeheonai-production-2130.up.railway.app").rstrip("/")
        # gw가 /api로 끝나든 아니든 안전하게 /api/v1/corporation이 되도록 보정
        if not gw.endswith("/api"):
            gw = gw + "/api"
        self.base_url = f"{gw}/v1/corporation"   # ✅ 최종: https://.../api/v1/corporation
        logger.info(f"[CorporationClient] base_url={self.base_url}")

        self.client = httpx.AsyncClient(timeout=10.0)

    async def __aenter__(self): return self
    async def __aexit__(self, exc_type, exc_val, exc_tb): await self.client.aclose()

    async def validate_corporation_exists(self, corporation_id: int) -> bool:
        try:
            url = f"{self.base_url}/validate/{corporation_id}"   # ✅ /api/v1/corporation/validate/{id}
            resp = await self.client.get(url)
            if resp.status_code == 200:
                return bool(resp.json().get("valid", False))
            if resp.status_code == 404:
                return False
            logger.error(f"[validate] {resp.status_code} {resp.text}")
            return False
        except Exception as e:
            logger.error(f"기업 ID 검증 중 오류: {e}")
            return False

    async def get_corporation_by_id(self, corporation_id: int) -> Optional[Dict[str, Any]]:
        try:
            url = f"{self.base_url}/{corporation_id}"            # ✅ /api/v1/corporation/{id}
            resp = await self.client.get(url)
            return resp.json() if resp.status_code == 200 else None
        except Exception as e:
            logger.error(f"기업 정보 조회 오류: {e}")
            return None

    async def get_corporation_by_code(self, corp_code: str) -> Optional[Dict[str, Any]]:
        try:
            url = f"{self.base_url}/code/{corp_code}"            # ✅ /api/v1/corporation/code/{code}
            resp = await self.client.get(url)
            return resp.json() if resp.status_code == 200 else None
        except Exception as e:
            logger.error(f"기업 코드 조회 오류: {e}")
            return None

    async def get_all_corporations(self, skip: int = 0, limit: int = 100):
        try:
            url = f"{self.base_url}?skip={skip}&limit={limit}"    # ✅ /api/v1/corporation?skip=..&limit=..
            resp = await self.client.get(url)
            return resp.json() if resp.status_code == 200 else None
        except Exception as e:
            logger.error(f"기업 목록 조회 오류: {e}")
            return None
