import os
from .corporation_client import CorporationClient

def get_corporation_client() -> CorporationClient:
    """corporation-service 클라이언트 의존성"""
    base_url = os.getenv("CORPORATION_SERVICE_URL", "http://localhost:8009")
    return CorporationClient(base_url)
