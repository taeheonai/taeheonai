from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.domain.repository.grireport_repository import GRIReportRepository
from app.domain.schema.grireport_schema import (
    GRIESGSectionData,
    GRIReportStructureResponse,
    DuplicateGRIIndexInfo,
    ResolveDuplicateGRIRequest
)

class GRIReportService:
    def __init__(self, session: AsyncSession):
        self._repository = GRIReportRepository(session)

    async def get_report_structure(
        self,
        corporation_id: int,
        companyname: str | None = None
    ) -> GRIReportStructureResponse:
        """ESG 섹션별 GRI 보고서 구조 조회"""
        try:
            # 각 ESG 섹션별 데이터 조회
            environmental = await self._repository.get_esg_section_data(corporation_id, 1)
            social = await self._repository.get_esg_section_data(corporation_id, 2)
            governance = await self._repository.get_esg_section_data(corporation_id, 3)

            # 응답 구성
            return GRIReportStructureResponse(
                corporation_id=corporation_id,
                companyname=companyname or "Unknown Corporation",
                environmental=environmental,
                social=social,
                governance=governance,
                last_updated=max([
                    section.answers[-1].last_modified
                    for sections in [environmental, social, governance]
                    for section in sections
                    if section.answers
                ], default=None)
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to get GRI report structure: {str(e)}"
            )

    async def find_duplicate_indexes(
        self,
        corporation_id: int
    ) -> List[DuplicateGRIIndexInfo]:
        """중복된 GRI 인덱스 찾기"""
        try:
            return await self._repository.find_duplicate_indexes(corporation_id)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to find duplicate GRI indexes: {str(e)}"
            )

    async def resolve_duplicate(
        self,
        corporation_id: int,
        request: ResolveDuplicateGRIRequest
    ) -> bool:
        """중복 GRI 인덱스 해결"""
        try:
            return await self._repository.resolve_duplicate(
                corporation_id=corporation_id,
                standard_code=request.standard_code,
                selected_issuepool_id=request.selected_issuepool_id
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to resolve duplicate GRI index: {str(e)}"
            )

    async def save_answers(
        self,
        corporation_id: int,
        answers: dict
    ) -> bool:
        """GRI 답변 저장"""
        try:
            return await self._repository.save_answers(
                corporation_id=corporation_id,
                answers=answers
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save GRI answers: {str(e)}"
            )

    async def get_answers(
        self,
        corporation_id: int
    ) -> dict:
        """저장된 GRI 답변 조회"""
        try:
            return await self._repository.get_answers(corporation_id)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to get GRI answers: {str(e)}"
            )