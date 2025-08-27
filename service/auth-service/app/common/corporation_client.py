import os
import httpx
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

def _build_base() -> str:
    # 우선순위: CORPORATION_SERVICE_URL > GATEWAY_URL > 로컬
    svc = os.getenv("CORPORATION_SERVICE_URL")
    gw  = os.getenv("GATEWAY_URL")
    raw = (svc or gw or "http://localhost:8009").rstrip("/")

    # Gateway면 보통 /api 붙어있음 → /v1/corporation까지 만들어줌
    # 서비스 직결이어도 동일하게 /v1/corporation을 붙임
    return f"{raw}/v1/corporation"

class CorporationClient:
    """기업 정보 서비스와 통신"""

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or _build_base()).rstrip("/")
        # Railway/HTTPS 환경 대비
        self.client = httpx.AsyncClient(timeout=10.0)

        logger.info(f"[CorporationClient] base_url={self.base_url}")

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()

    async def validate_corporation_exists(self, corporation_id: int) -> bool:
        url = f"{self.base_url}/validate/{corporation_id}"
        try:
            r = await self.client.get(url)
            if r.status_code == 200:
                return bool(r.json().get("valid", False))
            if r.status_code == 404:
                return False
            logger.error(f"[validate] {r.status_code} {r.text}")
            return False
        except Exception as e:
            logger.error(f"[validate] connect error: {e}")
            return False

    async def get_corporation_by_id(self, corporation_id: int) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/{corporation_id}"
        try:
            r = await self.client.get(url)
            if r.status_code == 200:
                return r.json()
            if r.status_code == 404:
                return None
            logger.error(f"[get_by_id] {r.status_code} {r.text}")
            return None
        except Exception as e:
            logger.error(f"[get_by_id] connect error: {e}")
            return None

    async def get_corporation_by_code(self, corp_code: str) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/code/{corp_code}"
        try:
            r = await self.client.get(url)
            if r.status_code == 200:
                return r.json()
            if r.status_code == 404:
                return None
            logger.error(f"[get_by_code] {r.status_code} {r.text}")
            return None
        except Exception as e:
            logger.error(f"[get_by_code] connect error: {e}")
            return None

    async def get_all_corporations(self, skip: int = 0, limit: int = 100) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}?skip={skip}&limit={limit}"
        try:
            r = await self.client.get(url)
            if r.status_code == 200:
                return r.json()
            logger.error(f"[list] {r.status_code} {r.text}")
            return None
        except Exception as e:
            logger.error(f"[list] connect error: {e}")
            return None
