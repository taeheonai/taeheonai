from typing import Optional, Dict, Any
from datetime import datetime
from app.domain.repository.polish_repository import PolishRepository
from app.domain.schema.polish_schema import (
    PolishRequest,
    PolishCreate,
    PolishResponse,
    PolishUpdate
)


class PolishService:
    def __init__(self):
        # 캐시 기반 repository 사용
        self.repo = PolishRepository()

    async def create_polish(self, data: PolishCreate) -> PolishResponse:
        """윤문 결과 생성"""
        saved = await self.repo.save(data)
        return PolishResponse.model_validate(saved)

    async def get_polish(self, session_key: str, gri_index: str) -> Optional[PolishResponse]:
        """세션과 GRI 인덱스로 윤문 결과 조회"""
        result = await self.repo.get(session_key, gri_index)
        return PolishResponse.model_validate(result) if result else None

    async def list_by_session(self, session_key: str) -> list[PolishResponse]:
        """세션별 윤문 결과 목록 조회"""
        results = await self.repo.list_by_session(session_key)
        return [PolishResponse.model_validate(r) for r in results]

    async def update_polish(
        self, 
        session_key: str, 
        gri_index: str, 
        data: PolishUpdate
    ) -> Optional[PolishResponse]:
        """윤문 결과 업데이트"""
        updated = await self.repo.update(session_key, gri_index, data)
        return PolishResponse.model_validate(updated) if updated else None

    async def delete_polish(self, session_key: str, gri_index: str) -> bool:
        """윤문 결과 삭제"""
        return await self.repo.delete(session_key, gri_index)

    async def clear_session(self, session_key: str) -> bool:
        """세션의 모든 윤문 결과 삭제"""
        return await self.repo.clear_session(session_key)
