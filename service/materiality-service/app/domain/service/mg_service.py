# app/domain/service/mg_service.py
from typing import List
import httpx, os
from app.domain.repository.mg_repository import MGRepository
from app.domain.schema.mg_schema import MGIndexDTO

# 🔧 LLM Service URL 환경변수 수정
LLM_BASE = os.getenv("LLM_SERVICE_URL", "http://localhost:8005")  # 기본값 추가

class MGService:
    def __init__(self, repo: MGRepository):
        self.repo = repo

    async def resolve_indexes(self, issuepool_ids: List[int]) -> List[MGIndexDTO]:
        rows = await self.repo.get_indexes_for_issuepools(issuepool_ids)
        # 그룹화된 데이터를 DTO로 변환
        return [MGIndexDTO(**row) for row in rows]

    async def request_polish(self, session_key: str, thread_id: str, items: List[MGIndexDTO]):
        payload = {
            "session_key": session_key,
            "thread_id": thread_id,
            "items": [
                {
                    "issuepool_id": i.issuepool_id,
                    "category_id": i.category_id,
                    "gri_index": i.gri_index,
                    "grade": i.grade,
                    "frequency": i.frequency
                } for i in items
            ]
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            # 🔧 LLM Service 엔드포인트 수정
            r = await client.post(f"{LLM_BASE}/v1/polish", json=payload)
            r.raise_for_status()
            return r.json()  # {job_id:...} 혹은 즉시 결과
