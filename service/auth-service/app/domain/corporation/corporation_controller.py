from fastapi import HTTPException
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.corporation.corporation_schema import CorporationCreate, CorporationResponse, CorporationSearch
from app.domain.corporation.corporation_service import CorporationService

class CorporationController:
    """
    기업 정보 요청을 적절한 서비스로 전달하는 컨트롤러
    """
    
    def __init__(self):
        pass

    async def create_corporation(self, request: CorporationCreate, db: AsyncSession) -> Dict[str, Any]:
        """기업 정보 생성 요청을 CorporationService로 전달"""
        try:
            corporation_service = CorporationService(db)
            result = await corporation_service.create_corporation(request)
            
            return {
                "success": True,
                "message": "기업 정보가 성공적으로 생성되었습니다.",
                "data": result
            }
            
        except Exception as e:
            raise

    async def search_corporations(self, search_data: CorporationSearch, db: AsyncSession) -> Dict[str, Any]:
        """기업 검색 요청을 CorporationService로 전달"""
        try:
            corporation_service = CorporationService(db)
            result = await corporation_service.search_corporations(search_data)
            
            return {
                "success": True,
                "message": "기업 검색이 완료되었습니다.",
                "data": result,
                "count": len(result)
            }
            
        except Exception as e:
            raise

    async def get_corporation_by_id(self, corporation_id: int, db: AsyncSession) -> Dict[str, Any]:
        """ID로 기업 정보 조회 요청을 CorporationService로 전달"""
        try:
            corporation_service = CorporationService(db)
            result = await corporation_service.get_corporation_by_id(corporation_id)
            
            if not result:
                raise HTTPException(status_code=404, detail=f"기업 ID {corporation_id}를 찾을 수 없습니다.")
            
            return {
                "success": True,
                "message": "기업 정보를 성공적으로 조회했습니다.",
                "data": result
            }
            
        except HTTPException:
            raise
        except Exception as e:
            raise

    async def get_all_corporations(self, skip: int = 0, limit: int = 100, db: AsyncSession) -> Dict[str, Any]:
        """모든 기업 정보 조회 요청을 CorporationService로 전달"""
        try:
            corporation_service = CorporationService(db)
            result = await corporation_service.get_all_corporations(skip, limit)
            
            return {
                "success": True,
                "message": "기업 목록을 성공적으로 조회했습니다.",
                "data": result,
                "count": len(result)
            }
            
        except Exception as e:
            raise
