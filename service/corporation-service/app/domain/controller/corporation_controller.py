from fastapi import HTTPException
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.schema.corporation_schema import (
    CorporationResponse, 
    CorporationCreate, 
    CorporationUpdate,
    CorporationListResponse
)
from app.domain.service.corporation_service import CorporationService

class CorporationController:
    """
    기업 정보 요청을 적절한 서비스로 전달하는 컨트롤러
    """
    
    def __init__(self):
        pass

    async def get_all_corporations(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> CorporationListResponse:
        """모든 기업 정보 조회 요청을 CorporationService로 전달"""
        try:
            corporation_service = CorporationService(db)
            result = await corporation_service.get_all_corporations(skip, limit)
            return result
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"기업 목록 조회 실패: {str(e)}")
    
    async def get_corporation_by_id(self, db: AsyncSession, corporation_id: int) -> CorporationResponse:
        """ID로 기업 정보 조회"""
        try:
            corporation_service = CorporationService(db)
            result = await corporation_service.get_corporation_by_id(corporation_id)
            
            if not result:
                raise HTTPException(status_code=404, detail="기업을 찾을 수 없습니다.")
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"기업 정보 조회 실패: {str(e)}")
    
    async def get_corporation_by_corp_code(self, db: AsyncSession, corp_code: str) -> CorporationResponse:
        """기업 코드로 기업 정보 조회"""
        try:
            corporation_service = CorporationService(db)
            result = await corporation_service.get_corporation_by_corp_code(corp_code)
            
            if not result:
                raise HTTPException(status_code=404, detail="기업을 찾을 수 없습니다.")
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"기업 정보 조회 실패: {str(e)}")
    
    async def search_corporations(self, db: AsyncSession, query: str, limit: int = 20) -> List[CorporationResponse]:
        """기업명으로 검색"""
        try:
            corporation_service = CorporationService(db)
            result = await corporation_service.search_corporations(query, limit)
            return result
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"기업 검색 실패: {str(e)}")
    
    async def create_corporation(self, db: AsyncSession, corporation_data: CorporationCreate) -> CorporationResponse:
        """새 기업 정보 생성"""
        try:
            corporation_service = CorporationService(db)
            result = await corporation_service.create_corporation(corporation_data)
            return result
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"기업 정보 생성 실패: {str(e)}")
    
    async def update_corporation(self, db: AsyncSession, corporation_id: int, update_data: CorporationUpdate) -> CorporationResponse:
        """기업 정보 수정"""
        try:
            corporation_service = CorporationService(db)
            result = await corporation_service.update_corporation(corporation_id, update_data)
            
            if not result:
                raise HTTPException(status_code=404, detail="수정할 기업을 찾을 수 없습니다.")
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"기업 정보 수정 실패: {str(e)}")
    
    async def delete_corporation(self, db: AsyncSession, corporation_id: int) -> Dict[str, Any]:
        """기업 정보 삭제"""
        try:
            corporation_service = CorporationService(db)
            result = await corporation_service.delete_corporation(corporation_id)
            
            if not result:
                raise HTTPException(status_code=404, detail="삭제할 기업을 찾을 수 없습니다.")
            
            return {
                "success": True,
                "message": "기업 정보가 성공적으로 삭제되었습니다."
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"기업 정보 삭제 실패: {str(e)}")
    
    async def validate_corporation_exists(self, db: AsyncSession, corporation_id: int) -> bool:
        """기업 ID가 유효한지 검증 (다른 서비스에서 사용)"""
        try:
            corporation_service = CorporationService(db)
            result = await corporation_service.validate_corporation_exists(corporation_id)
            return result
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"기업 ID 검증 실패: {str(e)}")
