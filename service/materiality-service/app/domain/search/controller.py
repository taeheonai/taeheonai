"""
Search Controller - MVC 구조에서 BaseModel을 SearchService로 전달하는 컨트롤러
데이터베이스 연결은 하지 않고, Service를 거쳐 Repository까지 BaseModel을 전달
"""
import logging
from app.domain.search.service import SearchService
from app.domain.search.schema import CompanySearchRequest

logger = logging.getLogger(__name__)

class SearchController:
    """기업 검색 컨트롤러 - MVC 구조에서 BaseModel을 Service로 전달"""
    
    def __init__(self):
        self.search_service = SearchService()
    
    async def get_all_companies(self):
        """모든 기업 목록 조회"""
        try:
            logger.info("🔍 컨트롤러: 모든 기업 목록 조회 요청을 Service로 전달")
            
            # Service를 통해 Repository 호출 (데이터베이스 연결 없음)
            result = await self.search_service.get_all_companies()
            
            logger.info(f"✅ 컨트롤러: Service 응답 수신 - {result.get('success', False)}")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: Service 호출 중 오류 - {str(e)}")
            raise

    async def search_company(self, search_data: CompanySearchRequest):
        """
        기업 검색 BaseModel을 SearchService로 전달
        
        Args:
            search_data: CompanySearchRequest BaseModel
        """
        try:
            logger.info(f"🔍 컨트롤러: 기업 검색 요청을 Service로 전달 - {search_data.companyname}")
            
            # BaseModel을 Service로 전달 (데이터베이스 연결 없음)
            result = await self.search_service.search_company_by_name(search_data.companyname)
            
            logger.info(f"✅ 컨트롤러: Service 응답 수신 - {result.get('success', False)}")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: Service 호출 중 오류 - {str(e)}")
            raise

    async def validate_search_request(self, search_data: dict):
        """
        검색 데이터 검증 요청을 SearchService로 전달
        
        Args:
            search_data: 검색 데이터 딕셔너리
        """
        try:
            logger.info("🔍 컨트롤러: 검색 데이터 검증 요청을 Service로 전달")
            
            # 딕셔너리를 Service로 전달하여 검증 (데이터베이스 연결 없음)
            result = await self.search_service.validate_company_search(search_data)
            
            logger.info(f"✅ 컨트롤러: Service 검증 응답 수신 - {result.get('success', False)}")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: Service 검증 호출 중 오류 - {str(e)}")
            raise

# 컨트롤러 인스턴스 생성
search_controller = SearchController()
