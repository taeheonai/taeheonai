# app/domain/controller/mg_controller.py
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.service.mg_service import MGService
from app.domain.repository.mg_repository import MGRepository
from app.domain.schema.mg_schema import (
    MGIndexDTO,
    MGResolveRequest,
    # ✅ 신규 DTO
    MGPolishIndexRequest,
    MGPolishIndexResponse,
    MGIndexBlock
)


class MGController:
    """MG 관련 비즈니스 로직을 조정하는 컨트롤러"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = MGRepository(db)
        self.service = MGService(self.repository)

    # -------------------------------
    # 1) IssuePool → GRI 인덱스 조회
    # -------------------------------
    async def resolve_indexes(self, request: MGResolveRequest) -> List[MGIndexDTO]:
        """IssuePool ID들에 대한 GRI 인덱스 해결"""
        try:
            return await self.service.resolve_indexes(request.issuepool_ids)
        except Exception as e:
            print(f"MG Index 해결 실패: {e}")
            raise Exception(f"MG Index 해결에 실패했습니다: {str(e)}")

    async def resolve_indexes_by_ids(self, issuepool_ids: List[int]) -> List[MGIndexDTO]:
        """IssuePool ID 리스트로 직접 GRI 인덱스 해결"""
        try:
            return await self.service.resolve_indexes(issuepool_ids)
        except Exception as e:
            print(f"MG Index 해결 실패: {e}")
            raise Exception(f"MG Index 해결에 실패했습니다: {str(e)}")

    async def get_indexes_for_issuepools(self, issuepool_ids: List[int]) -> List[MGIndexDTO]:
        """Repository를 직접 사용하여 GRI 인덱스 조회 (추가 로직 필요시)"""
        try:
            return await self.service.resolve_indexes(issuepool_ids)
        except Exception as e:
            print(f"MG Index 조회 실패: {e}")
            raise Exception(f"MG Index 조회에 실패했습니다: {str(e)}")

    # -------------------------------
    # 2) 레거시 Polish 요청 (배열 기반)
    # -------------------------------
    async def request_polish(self, session_key: str, thread_id: str, items: List[MGIndexDTO]):
        """GRI 인덱스에 대한 Polish 요청 (레거시)"""
        try:
            return await self.service.request_polish(session_key, thread_id, items)
        except Exception as e:
            print(f"MG Polish 요청 실패: {e}")
            raise Exception(f"MG Polish 요청에 실패했습니다: {str(e)}")

    # -------------------------------
    # 3) 인덱스 단위(a,b,c 묶음) Polish 요청 (신규)
    # -------------------------------
    async def polish_index(self, req: MGPolishIndexRequest) -> MGPolishIndexResponse:
        """
        하나의 GRI 인덱스(예: '404-1') 안에 포함된
        질문/답변(a,b,c,...)을 모두 합쳐서 한 번에 윤문 요청
        """
        try:
            return await self.service.polish_index(req)
        except Exception as e:
            print(f"MG Index Polish 요청 실패: {e}")
            raise Exception(f"MG Index Polish 요청에 실패했습니다: {str(e)}")

    async def get_questions_by_category(self, category_id: int) -> MGIndexResponse:
            return await self.service.get_questions_by_category(category_id)

    async def get_questions_for_index(self, category_id: int, gri_index: str) -> MGIndexBlock:
            return await self.service.get_questions_for_index(category_id=category_id, gri_index=gri_index)