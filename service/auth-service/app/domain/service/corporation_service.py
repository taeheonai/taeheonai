from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.repository.corporation_repository import CorporationRepository
from app.domain.schema.corporation_schema import CorporationCreate, CorporationResponse, CorporationSearch
from app.domain.entity.corporation_entity import Corporation

class CorporationService:
    """기업 정보 비즈니스 로직 계층"""
    
    def __init__(self, db: AsyncSession):
        self.repo = CorporationRepository(db)
    
    async def create_corporation(self, data: CorporationCreate) -> CorporationResponse:
        """기업 정보 생성"""
        try:
            # 기존 기업명 확인
            existing = await self.repo.get_by_name(data.companyname)
            if existing:
                raise Exception(f"기업명 '{data.companyname}'이 이미 존재합니다.")
            
            # 새 기업 생성
            corporation = Corporation(
                companyname=data.companyname,
                industry=data.industry
            )
            created = await self.repo.create(corporation)
            
            return CorporationResponse.model_validate(created)
            
        except Exception as e:
            raise Exception(f"기업 생성 실패: {str(e)}")
    
    async def get_corporation_by_id(self, corporation_id: int) -> Optional[CorporationResponse]:
        """ID로 기업 정보 조회"""
        try:
            corporation = await self.repo.get_by_id(corporation_id)
            if not corporation:
                return None
            
            return CorporationResponse.model_validate(corporation)
            
        except Exception as e:
            raise Exception(f"기업 조회 실패: {str(e)}")
    
    async def search_corporations(self, search_data: CorporationSearch) -> List[CorporationResponse]:
        """기업명으로 검색"""
        try:
            corporations = await self.repo.search_by_name(search_data.q)
            return [CorporationResponse.model_validate(corp) for corp in corporations]
            
        except Exception as e:
            raise Exception(f"기업 검색 실패: {str(e)}")
    
    async def get_or_create_corporation(self, name: str, industry: str = None) -> int:
        """기업이 없으면 생성하고 ID 반환 (회원가입용)"""
        try:
            return await self.repo.create_if_not_exists(name, industry)
        except Exception as e:
            raise Exception(f"기업 조회/생성 실패: {str(e)}")
    
    async def get_all_corporations(self, skip: int = 0, limit: int = 100) -> List[CorporationResponse]:
        """모든 기업 정보 조회"""
        try:
            corporations = await self.repo.get_all(skip, limit)
            return [CorporationResponse.model_validate(corp) for corp in corporations]
            
        except Exception as e:
            raise Exception(f"기업 목록 조회 실패: {str(e)}")
