from typing import List
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.database import get_db
from app.domain.service.grireport_service import GRIReportService
from app.domain.schema.grireport_schema import (
    GRIReportStructureResponse,
    DuplicateGRIIndexInfo,
    ResolveDuplicateGRIRequest
)

class GRIReportController:
    def __init__(self, session: AsyncSession = Depends(get_db)):
        self._service = GRIReportService(session)

    async def get_report_structure(
        self,
        corporation_id: int,
        companyname: str | None = None
    ) -> GRIReportStructureResponse:
        """GRI 보고서 구조 조회"""
        data = await self._service.get_report_structure(
            corporation_id=corporation_id,
            companyname=companyname
        )
        
        # 기업/데이터 없음은 404로 처리
        if (not data.environmental and not data.social and not data.governance):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="No GRI data for this corporation_id")
            
        return data

    async def find_duplicate_indexes(
        self,
        corporation_id: int
    ) -> List[DuplicateGRIIndexInfo]:
        """중복된 GRI 인덱스 찾기"""
        return await self._service.find_duplicate_indexes(
            corporation_id=corporation_id
        )

    async def resolve_duplicate(
        self,
        corporation_id: int,
        request: ResolveDuplicateGRIRequest
    ) -> bool:
        """중복 GRI 인덱스 해결"""
        return await self._service.resolve_duplicate(
            corporation_id=corporation_id,
            request=request
        )

    async def save_answers(
        self,
        corporation_id: int,
        answers: dict
    ) -> bool:
        """GRI 답변 저장"""
        return await self._service.save_answers(
            corporation_id=corporation_id,
            answers=answers
        )

    async def get_answers(
        self,
        corporation_id: int
    ) -> dict:
        """저장된 GRI 답변 조회"""
        return await self._service.get_answers(
            corporation_id=corporation_id
        )