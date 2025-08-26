from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.repository.corporation_repository import CorporationRepository
from app.domain.schema.corporation_schema import CorporationResponse

class CorporationService:
    """기업 정보 비즈니스 로직 계층"""
    
    def __init__(self, db: AsyncSession):
        self.repo = CorporationRepository(db)
    
    async def get_all_corporations(self, skip: int = 0, limit: int = 100) -> List[CorporationResponse]:
        """모든 기업 정보 조회"""
        try:
            corporations = await self.repo.get_all(skip, limit)
            return [CorporationResponse.model_validate(corp) for corp in corporations]
            
        except Exception as e:
            raise Exception(f"기업 목록 조회 실패: {str(e)}")
