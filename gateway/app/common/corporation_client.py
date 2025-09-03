import httpx
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

class CorporationClient:
    """corporation-service와 통신하는 클라이언트"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
    
    async def get_corporation_by_id(self, corporation_id: int):
        """ID로 회사 정보 조회"""
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/v1/corporations/{corporation_id}"
                logger.info(f"corporation-service 호출: {url}")
                
                response = await client.get(url, timeout=10.0)
                
                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"회사 정보 조회 성공: ID={corporation_id}")
                    return data
                elif response.status_code == 404:
                    logger.warning(f"회사 정보 없음: ID={corporation_id}")
                    raise HTTPException(status_code=404, detail="회사 정보를 찾을 수 없습니다")
                else:
                    logger.error(f"corporation-service 오류: {response.status_code}")
                    raise HTTPException(status_code=response.status_code, detail="회사 정보 조회 중 오류가 발생했습니다")
                    
        except httpx.TimeoutException:
            logger.error(f"corporation-service 타임아웃: ID={corporation_id}")
            raise HTTPException(status_code=504, detail="회사 정보 조회 시간 초과")
        except httpx.RequestError as e:
            logger.error(f"corporation-service 연결 오류: {e}")
            raise HTTPException(status_code=503, detail="회사 정보 서비스에 연결할 수 없습니다")
        except Exception as e:
            logger.error(f"회사 정보 조회 예외: {e}")
            raise HTTPException(status_code=500, detail="회사 정보 조회 중 오류가 발생했습니다")
