from fastapi import HTTPException
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.schema.corporation_schema import CorporationResponse
from app.domain.service.corporation_service import CorporationService

class CorporationController:
    """
    기업 정보 요청을 적절한 서비스로 전달하는 컨트롤러
    """
    
    def __init__(self):
        pass

    async def get_all_corporations(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> Dict[str, Any]:
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
