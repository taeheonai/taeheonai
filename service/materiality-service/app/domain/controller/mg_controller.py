# app/domain/controller/mg_controller.py
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.service.mg_service import MGService
from app.domain.repository.mg_repository import MGRepository
from app.domain.schema.mg_schema import MGIndexDTO, MGResolveRequest

class MGController:
    """MG 관련 비즈니스 로직을 조정하는 컨트롤러"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = MGRepository(db)
        self.service = MGService(self.repository)
    
    async def resolve_indexes(self, request: MGResolveRequest) -> List[MGIndexDTO]:
        """IssuePool ID들에 대한 GRI 인덱스 해결"""
        try:
            return await self.service.resolve_indexes(request.issuepool_ids)
        except Exception as e:
            # 로깅 및 에러 처리
            print(f"MG Index 해결 실패: {e}")
            raise Exception(f"MG Index 해결에 실패했습니다: {str(e)}")
    
    async def resolve_indexes_by_ids(self, issuepool_ids: List[int]) -> List[MGIndexDTO]:
        """IssuePool ID 리스트로 직접 GRI 인덱스 해결"""
        try:
            return await self.service.resolve_indexes(issuepool_ids)
        except Exception as e:
            print(f"MG Index 해결 실패: {e}")
            raise Exception(f"MG Index 해결에 실패했습니다: {str(e)}")
    
    async def request_polish(self, session_key: str, thread_id: str, items: List[MGIndexDTO]):
        """GRI 인덱스에 대한 Polish 요청"""
        try:
            return await self.service.request_polish(session_key, thread_id, items)
        except Exception as e:
            print(f"MG Polish 요청 실패: {e}")
            raise Exception(f"MG Polish 요청에 실패했습니다: {str(e)}")
    
    async def get_indexes_for_issuepools(self, issuepool_ids: List[int]) -> List[MGIndexDTO]:
        """Repository를 직접 사용하여 GRI 인덱스 조회 (컨트롤러 레벨에서 추가 로직 필요시)"""
        try:
            return await self.service.resolve_indexes(issuepool_ids)
        except Exception as e:
            print(f"MG Index 조회 실패: {e}")
            raise Exception(f"MG Index 조회에 실패했습니다: {str(e)}")
