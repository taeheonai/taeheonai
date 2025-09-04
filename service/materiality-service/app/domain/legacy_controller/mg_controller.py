# app/domain/controller/mg_controller.py
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.legacy_service.mg_service import MGService
from app.domain.legacy_repository.mg_repository import MGRepository
from app.domain.legacy_schema.mg_schema import (
    MGIndexDTO,
    MGResolveRequest,
    # ✅ 신규 DTO
    MGPolishIndexRequest,
    MGPolishIndexResponse,
    MGIndexBlock,
    MGIndexResponse
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

    async def get_issuepool_by_category_id(self, category_id: int) -> MGIndexDTO:
        """카테고리 ID로 실제 issuepool 데이터와 GRI 인덱스 조회"""
        try:
            print(f"[MG Controller] 카테고리 {category_id}의 실제 issuepool 데이터 조회 시작")
            
            # Repository에서 실제 issuepool 데이터 조회
            issuepool_data = await self.repository.get_issuepool_by_category_id(category_id)
            if not issuepool_data:
                print(f"[MG Controller] 카테고리 {category_id}의 issuepool 데이터가 없음")
                return None
                
            print(f"[MG Controller] 실제 issuepool 데이터 조회 성공: {issuepool_data.issue_pool}")
            
            # 해당 카테고리의 GRI 인덱스 조회
            gri_indexes = await self.repository.get_gri_indexes_by_category(category_id)
            print(f"[MG Controller] GRI 인덱스 {len(gri_indexes)}개 조회 완료")
            
            # MGIndexDTO 형태로 변환 (실제 데이터베이스 데이터 사용)
            result = MGIndexDTO(
                issuepool_id=issuepool_data.id,  # 실제 데이터베이스의 id
                issue_pool=issuepool_data.issue_pool,  # 실제 데이터베이스의 issue_pool
                ranking=issuepool_data.ranking,  # 실제 데이터베이스의 ranking
                publish_year=issuepool_data.publish_year,  # 실제 데이터베이스의 publish_year
                corporation_id=issuepool_data.corporation_id,  # 실제 데이터베이스의 corporation_id
                category_id=issuepool_data.category_id,  # 실제 데이터베이스의 category_id
                esg_classification_id=issuepool_data.esg_classification_id,  # 실제 데이터베이스의 esg_classification_id
                gri_indexes=gri_indexes
            )
            
            print(f"[MG Controller] MGIndexDTO 생성 완료: {result.issue_pool}")
            return result
            
        except Exception as e:
            print(f"[MG Controller] 카테고리 {category_id}의 issuepool 데이터 조회 실패: {e}")
            import traceback; traceback.print_exc()
            return None

    async def get_gri_indexes_by_category(self, category_id: int) -> List[MGIndexDTO]:
        """카테고리 ID로 GRI 인덱스 조회"""
        try:
            # Repository에서 카테고리별 GRI 인덱스 조회
            gri_indexes = await self.repository.get_gri_indexes_by_category(category_id)
            
            # MGIndexDTO 형태로 변환
            result = []
            if gri_indexes:
                # 카테고리별로 하나의 MGIndexDTO 생성
                mg_index_dto = MGIndexDTO(
                    issuepool_id=category_id,  # 임시로 category_id 사용
                    issue_pool=f"카테고리 {category_id}",  # 임시 이슈풀명
                    category_id=category_id,
                    esg_classification_id=1,  # 임시 ESG 분류 ID
                    corporation_id=1,  # 임시 기업 ID
                    publish_year="2024",
                    ranking="1",
                    gri_indexes=gri_indexes
                )
                result.append(mg_index_dto)
            
            return result
        except Exception as e:
            print(f"카테고리별 GRI 인덱스 조회 실패: {e}")
            raise Exception(f"카테고리별 GRI 인덱스 조회에 실패했습니다: {str(e)}")

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