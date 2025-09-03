"""
Search Service - 기업 검색 관련 모든 서비스 통합
BaseModel을 받아서 Repository로 전달하는 중간 계층
데이터베이스 연결은 하지 않음
"""
import logging
from app.domain.search.repository import SearchRepository
from app.domain.search.schema import CompanySearchRequest

logger = logging.getLogger("search_service")

class SearchService:
    """기업 검색 서비스 - BaseModel을 Repository로 전달하는 중간 계층 (DB 연결 없음)"""
    
    def __init__(self):
        self.search_repository = SearchRepository()
    
    async def get_all_companies(self) -> dict:
        """모든 기업 목록 조회 - Repository를 통해 데이터베이스에서 가져옴"""
        try:
            logger.info("🔍 서비스: 모든 기업 목록 조회 요청을 Repository로 전달")
            
            # Repository를 통해 모든 기업 정보 조회 (데이터베이스 연결 없음)
            companies = await self.search_repository.get_all_corporations()
            
            if companies:
                logger.info(f"✅ 서비스: 기업 목록 조회 성공 - {len(companies)}개 기업")
                return {
                    "success": True,
                    "message": f"{len(companies)}개 기업을 찾았습니다.",
                    "companies": [
                        {
                            "id": i + 1,
                            "companyname": company.companyname
                        } for i, company in enumerate(companies)
                    ]
                }
            else:
                logger.info("❌ 서비스: 기업 목록이 비어있음")
                return {
                    "success": False,
                    "message": "등록된 기업이 없습니다.",
                    "companies": []
                }
                
        except Exception as e:
            logger.error(f"❌ 서비스: 기업 목록 조회 중 오류 - {str(e)}")
            return {
                "success": False,
                "message": f"기업 목록 조회 중 오류가 발생했습니다: {str(e)}",
                "companies": []
            }
    
    async def search_company_by_name(self, companyname: str) -> dict:
        """기업명으로 기업 검색 - BaseModel을 Repository로 전달"""
        try:
            logger.info(f"🔍 서비스: 기업 검색 요청을 Repository로 전달 - {companyname}")
            
            # 입력값 검증
            if not companyname or companyname.strip() == "":
                logger.warning("❌ 서비스: 기업명이 비어있음")
                return {
                    "success": False, 
                    "message": "기업명을 입력해주세요."
                }
            
            # BaseModel을 Repository로 전달 (데이터베이스 연결 없음)
            company = await self.search_repository.find_corporation_by_name(companyname.strip())
            
            if company:
                logger.info(f"✅ 서비스: 기업 검색 성공 - {company.companyname}")
                return {
                    "success": True,
                    "message": "기업을 찾았습니다.",
                    "company": {
                        "companyname": company.companyname
                    }
                }
            else:
                logger.info(f"❌ 서비스: 기업을 찾을 수 없음 - {companyname}")
                return {
                    "success": False, 
                    "message": "해당 기업을 찾을 수 없습니다."
                }
                
        except Exception as e:
            logger.error(f"❌ 서비스: 기업 검색 처리 중 오류 - {str(e)}")
            return {
                "success": False, 
                "message": f"기업 검색 처리 중 오류가 발생했습니다: {str(e)}"
            }
    
    async def validate_company_search(self, search_data: dict) -> dict:
        """기업 검색 데이터 검증 - BaseModel 생성 및 검증"""
        try:
            logger.info("🔍 서비스: 기업 검색 데이터 검증")
            
            # 필수 필드 확인
            if not search_data.get('companyname'):
                logger.warning("❌ 서비스: 기업명 필드 누락")
                return {
                    "success": False,
                    "message": "기업명은 필수 입력 항목입니다."
                }
            
            # BaseModel 생성
            company_search = CompanySearchRequest(
                companyname=search_data['companyname']
            )
            
            logger.info(f"✅ 서비스: 검색 데이터 검증 완료 - {company_search.companyname}")
            return {
                "success": True,
                "message": "검색 데이터 검증 완료",
                "search_request": company_search
            }
            
        except Exception as e:
            logger.error(f"❌ 서비스: 검색 데이터 검증 중 오류 - {str(e)}")
            return {
                "success": False,
                "message": f"검색 데이터 검증 중 오류가 발생했습니다: {str(e)}"
            }
