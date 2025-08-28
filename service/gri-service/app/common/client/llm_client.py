from typing import Optional
import httpx
import logging
from app.common.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class LLMClient:
    def __init__(self):
        self.base_url = settings.llm_service_url.rstrip('/')
        self.timeout = httpx.Timeout(30.0)  # 30초 타임아웃

    async def polish(self, session_key: str, gri_index: str, answers: list[dict]) -> Optional[dict]:
        """LLM 서비스의 윤문 API 호출"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/v1/polish",
                    json={
                        "session_key": session_key,
                        "gri_index": gri_index,
                        "answers": answers
                    }
                )
                
                if response.status_code == 404:
                    return None
                    
                response.raise_for_status()
                return response.json()
                
        except httpx.HTTPError as e:
            logger.error(f"LLM 서비스 호출 실패: {str(e)}")
            raise Exception(f"LLM 서비스 호출 중 오류 발생: {str(e)}")
        except Exception as e:
            logger.error(f"예상치 못한 오류: {str(e)}")
            raise
