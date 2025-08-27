from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.repository.corporation_repository import CorporationRepository
from app.domain.schema.corporation_schema import (
    CorporationResponse, 
    CorporationCreate, 
    CorporationUpdate,
    CorporationListResponse
)
from app.domain.entity.corporation_entity import Corporation

class corporationervice:
    """기업 정보 비즈니스 로직 계층"""
    
    def __init__(self, db: AsyncSession):
        self.repo = CorporationRepository(db)
    
    async def get_all_corporation(self, skip: int = 0, limit: int = 100) -> CorporationListResponse:
        """모든 기업 정보 조회"""
        try:
            corporation, total = await self.repo.get_all(skip, limit)
            corporation_responses = [CorporationResponse.model_validate(corp) for corp in corporation]
            
            return CorporationListResponse(
                success=True,
                message="기업 목록을 성공적으로 조회했습니다.",
                data=corporation_responses,
                count=len(corporation_responses),
                total=total
            )
            
        except Exception as e:
            raise Exception(f"기업 목록 조회 실패: {str(e)}")
    
    async def get_corporation_by_id(self, corporation_id: int) -> Optional[CorporationResponse]:
        """ID로 기업 정보 조회"""
        try:
            corporation = await self.repo.get_by_id(corporation_id)
            if not corporation:
                return None
            
            return CorporationResponse.model_validate(corporation)
            
        except Exception as e:
            raise Exception(f"기업 정보 조회 실패: {str(e)}")
    
    async def get_corporation_by_corp_code(self, corp_code: str) -> Optional[CorporationResponse]:
        """기업 코드로 기업 정보 조회"""
        try:
            corporation = await self.repo.get_by_corp_code(corp_code)
            if not corporation:
                return None
            
            return CorporationResponse.model_validate(corporation)
            
        except Exception as e:
            raise Exception(f"기업 코드로 조회 실패: {str(e)}")
    
    async def search_corporation(self, query: str, limit: int = 20) -> List[CorporationResponse]:
        """기업명으로 검색"""
        try:
            corporation = await self.repo.search_by_name(query, limit)
            return [CorporationResponse.model_validate(corp) for corp in corporation]
            
        except Exception as e:
            raise Exception(f"기업 검색 실패: {str(e)}")
    
    async def create_corporation(self, corporation_data: CorporationCreate) -> CorporationResponse:
        """새 기업 정보 생성"""
        try:
            # 기존 기업 확인
            existing = await self.repo.get_by_corp_code(corporation_data.corp_code)
            if existing:
                raise Exception(f"기업 코드 {corporation_data.corp_code}가 이미 존재합니다.")
            
            # 새 기업 엔티티 생성
            new_corporation = Corporation(**corporation_data.model_dump())
            created_corporation = await self.repo.create(new_corporation)
            
            return CorporationResponse.model_validate(created_corporation)
            
        except Exception as e:
            raise Exception(f"기업 정보 생성 실패: {str(e)}")
    
    async def update_corporation(self, corporation_id: int, update_data: CorporationUpdate) -> Optional[CorporationResponse]:
        """기업 정보 수정"""
        try:
            # None이 아닌 값만 필터링
            update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
            
            if not update_dict:
                raise Exception("수정할 데이터가 없습니다.")
            
            updated_corporation = await self.repo.update(corporation_id, update_dict)
            if not updated_corporation:
                return None
            
            return CorporationResponse.model_validate(updated_corporation)
            
        except Exception as e:
            raise Exception(f"기업 정보 수정 실패: {str(e)}")
    
    async def delete_corporation(self, corporation_id: int) -> bool:
        """기업 정보 삭제"""
        try:
            return await self.repo.delete(corporation_id)
            
        except Exception as e:
            raise Exception(f"기업 정보 삭제 실패: {str(e)}")
    
    async def validate_corporation_exists(self, corporation_id: int) -> bool:
        """기업 ID가 유효한지 검증 (다른 서비스에서 사용)"""
        try:
            corporation = await self.repo.get_by_id(corporation_id)
            return corporation is not None
            
        except Exception as e:
            raise Exception(f"기업 ID 검증 실패: {str(e)}")
