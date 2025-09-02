from typing import List, Any
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
import logging

from app.domain.repository.grireport_repository import GRIReportRepository
from app.domain.schema.grireport_schema import (
    GRIESGSectionData,
    GRIReportStructureResponse,
    DuplicateGRIIndexInfo,
    ResolveDuplicateGRIRequest
)

logger = logging.getLogger(__name__)

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
            # 1) 레포에서 None이 오더라도 리스트 보장
            environmental = await self._repository.get_esg_section_data(corporation_id, 1) or []
            social = await self._repository.get_esg_section_data(corporation_id, 2) or []
            governance = await self._repository.get_esg_section_data(corporation_id, 3) or []

            # 2) last_updated 안전 계산
            def _collect_timestamps(items: List[Any]) -> List[Any]:
                ts: List[Any] = []
                for sec in items or []:
                    # answers가 None/dict/리스트 무엇이 와도 안전하게
                    answers = getattr(sec, "answers", None) or []
                    if isinstance(answers, dict):
                        answers = list(answers.values())
                    for ans in answers:
                        # dict/obj 모두 처리
                        val = (
                            (ans.get("last_modified") if isinstance(ans, dict) else getattr(ans, "last_modified", None))
                            or (ans.get("updated_at") if isinstance(ans, dict) else getattr(ans, "updated_at", None))
                            or (ans.get("created_at") if isinstance(ans, dict) else getattr(ans, "created_at", None))
                        )
                        if val:
                            ts.append(val)
                return ts

            try:
                timestamps = (
                    _collect_timestamps(environmental)
                    + _collect_timestamps(social)
                    + _collect_timestamps(governance)
                )
                last_updated = max(timestamps) if timestamps else None
            except Exception:
                logger.exception("failed to compute last_updated")
                last_updated = None

            # 3) Pydantic이 직렬화할 수 있도록 리스트 보장한 값을 그대로 넣음
            return GRIReportStructureResponse(
                corporation_id=corporation_id,
                companyname=companyname or "Unknown Corporation",
                environmental=environmental,
                social=social,
                governance=governance,
                last_updated=last_updated,
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.exception("get_report_structure failed")
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