from typing import Optional, Dict, List, Any, Tuple
from datetime import datetime, timezone
import asyncio
from app.domain.schema.polish_schema import PolishCreate, PolishUpdate, PolishEntity


class PolishRepository:
    def __init__(self):
        # key: (session_key, gri_index)
        self._store: Dict[Tuple[str, str], PolishEntity] = {}
        self._lock = asyncio.Lock()

    async def save(self, data: PolishCreate) -> PolishEntity:
        """윤문 결과 저장"""
        async with self._lock:
            key = (data.session_key, data.gri_index)
            now = datetime.now(timezone.utc)

            if key in self._store:
                ent = self._store[key]
                # 업데이트
                ent.polished_text = data.polished_text
                ent.model = data.model
                ent.updated_at = now
            else:
                ent = PolishEntity(
                    session_key=data.session_key,
                    gri_index=data.gri_index,
                    polished_text=data.polished_text,
                    model=data.model,
                )
                self._store[key] = ent

            return self._store[key]

    async def get(self, session_key: str, gri_index: str) -> Optional[PolishEntity]:
        """윤문 결과 조회"""
        key = (session_key, gri_index)
        return self._store.get(key)

    async def list_by_session(self, session_key: str) -> List[PolishEntity]:
        """세션별 윤문 결과 목록"""
        return [
            data for (s, _), data in self._store.items()
            if s == session_key
        ]

    async def update(
        self,
        session_key: str,
        gri_index: str,
        data: PolishUpdate
    ) -> Optional[PolishEntity]:
        """윤문 결과 업데이트"""
        async with self._lock:
            ent = await self.get(session_key, gri_index)
            if not ent:
                return None
            
            now = datetime.now(timezone.utc)
            if data.polished_text is not None:
                ent.polished_text = data.polished_text
            if data.model is not None:
                ent.model = data.model
            ent.updated_at = now
            return ent

    async def delete(self, session_key: str, gri_index: str) -> bool:
        """윤문 결과 삭제"""
        async with self._lock:
            key = (session_key, gri_index)
            return self._store.pop(key, None) is not None

    async def clear_session(self, session_key: str) -> bool:
        """세션의 모든 윤문 결과 삭제"""
        async with self._lock:
            keys = [k for k in self._store if k[0] == session_key]
            for k in keys:
                self._store.pop(k, None)
            return bool(keys)
