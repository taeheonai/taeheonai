from typing import Optional, Dict, List, Any
from datetime import datetime
import asyncio
from app.domain.schema.polish_schema import PolishCreate, PolishUpdate


class PolishRepository:
    def __init__(self):
        # 메모리 캐시 (실제 운영에서는 Redis 등으로 교체 가능)
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    def _make_key(self, session_key: str, gri_index: str) -> str:
        """캐시 키 생성"""
        return f"{session_key}:{gri_index}"

    async def save(self, data: PolishCreate) -> Dict[str, Any]:
        """윤문 결과 저장"""
        async with self._lock:
            key = self._make_key(data.session_key, data.gri_index)
            stored_data = data.model_dump()
            self._cache[key] = stored_data
            return stored_data

    async def get(self, session_key: str, gri_index: str) -> Optional[Dict[str, Any]]:
        """윤문 결과 조회"""
        key = self._make_key(session_key, gri_index)
        return self._cache.get(key)

    async def list_by_session(self, session_key: str) -> List[Dict[str, Any]]:
        """세션별 윤문 결과 목록"""
        return [
            data for key, data in self._cache.items()
            if key.startswith(f"{session_key}:")
        ]

    async def update(
        self,
        session_key: str,
        gri_index: str,
        data: PolishUpdate
    ) -> Optional[Dict[str, Any]]:
        """윤문 결과 업데이트"""
        async with self._lock:
            key = self._make_key(session_key, gri_index)
            if key not in self._cache:
                return None
            
            stored_data = self._cache[key]
            update_dict = data.model_dump(exclude_unset=True)
            stored_data.update(update_dict)
            stored_data["updated_at"] = datetime.now()
            self._cache[key] = stored_data
            return stored_data

    async def delete(self, session_key: str, gri_index: str) -> bool:
        """윤문 결과 삭제"""
        async with self._lock:
            key = self._make_key(session_key, gri_index)
            if key in self._cache:
                del self._cache[key]
                return True
            return False

    async def clear_session(self, session_key: str) -> bool:
        """세션의 모든 윤문 결과 삭제"""
        async with self._lock:
            keys_to_delete = [
                key for key in self._cache.keys()
                if key.startswith(f"{session_key}:")
            ]
            for key in keys_to_delete:
                del self._cache[key]
            return bool(keys_to_delete)
