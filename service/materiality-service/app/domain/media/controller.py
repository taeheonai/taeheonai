"""
Media Controller - MVC 구조에서 BaseModel을 MediaService로 전달하는 컨트롤러
데이터베이스 연결은 하지 않고, Service를 거쳐 Repository까지 BaseModel을 전달
"""
import logging
from app.domain.media.service import search_media

logger = logging.getLogger(__name__)

class MediaController:
    """미디어 검색 컨트롤러 - MVC 구조에서 BaseModel을 Service로 전달"""
    
    def __init__(self):
        pass
    
    async def search_media(self, search_data: dict):
        """
        미디어 검색 요청을 MediaService로 전달
        
        Args:
            search_data: 미디어 검색 요청 데이터 딕셔너리
        """
        try:
            logger.info(f"🔍 컨트롤러: 미디어 검색 요청을 Service로 전달 - {search_data.get('company_id', 'Unknown')}")
            
            # 딕셔너리를 Service로 전달 (데이터베이스 연결 없음)
            result = await search_media(search_data)
            
            logger.info(f"✅ 컨트롤러: Service 응답 수신 - {result.get('success', False)}")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: Service 호출 중 오류 - {str(e)}")
            raise

# 컨트롤러 인스턴스 생성
media_controller = MediaController()
