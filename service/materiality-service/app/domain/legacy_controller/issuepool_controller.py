# app/domain/controller/issuepool_controller.py
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.service.issuepool_service import IssuePoolService
from app.domain.schema.issuepool_schema import (
    IssuePoolDTO, 
    IssuePoolFilter, 
    IssuePoolListResponse,
    IssuePoolCreateRequest,
    IssuePoolUpdateRequest,
    IssuePoolBulkCreateRequest
)
from app.domain.legacy_entity.issuepool_entity import IssuePool
from app.common.legacy_database import get_db
import logging

logger = logging.getLogger(__name__)


class IssuePoolController:
    def __init__(self, db: AsyncSession):
        self.service = IssuePoolService(db)

    async def create_issuepool(self, request_data: IssuePoolCreateRequest) -> IssuePool:
        """Router에서 받은 JSON을 Service로 전달하여 IssuePool 생성"""
        try:
            # Router에서 받은 JSON을 DTO로 변환
            issuepool_dto = IssuePoolDTO(
                corporation_id=request_data.corporation_id,
                publish_year=request_data.publish_year,
                ranking=request_data.ranking,
                issue_pool=request_data.issue_pool,
                category_id=request_data.category_id,
                esg_classification_id=request_data.esg_classification_id
            )
            
            # Service에 DTO 전달하여 생성
            created_issuepool = await self.service.process_issuepool_creation(issuepool_dto)
            return created_issuepool
            
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"IssuePool 생성 실패: {str(e)}")

    async def get_issuepool_by_id(self, issuepool_id: int) -> IssuePool:
        """ID로 IssuePool 조회"""
        try:
            issuepool = await self.service.get_issuepool_by_id(issuepool_id)
            if not issuepool:
                raise HTTPException(status_code=404, detail=f"ID {issuepool_id}인 IssuePool을 찾을 수 없습니다.")
            return issuepool
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"IssuePool 조회 실패: {str(e)}")

    async def get_issuepools_by_corporation_and_year(self, corporation_id: int, publish_year: str) -> List[IssuePool]:
        """기업 ID와 발행 연도로 IssuePool 목록 조회"""
        try:
            issuepools = await self.service.get_issuepools_by_corporation_and_year(corporation_id, publish_year)
            return issuepools
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"IssuePool 목록 조회 실패: {str(e)}")

    async def get_filtered_issuepools(self, filter_params: Dict[str, Any]) -> List[IssuePool]:
        """필터 조건에 따른 IssuePool 목록 조회"""
        try:
            # Router에서 받은 JSON을 Filter DTO로 변환
            filter_dto = IssuePoolFilter(**filter_params)
            
            # Service에 Filter DTO 전달하여 조회
            issuepools = await self.service.get_filtered_issuepools(filter_dto)
            return issuepools
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"필터 파라미터 오류: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"필터링된 IssuePool 조회 실패: {str(e)}")

    async def update_issuepool(self, issuepool_id: int, request_data: IssuePoolUpdateRequest) -> IssuePool:
        """Router에서 받은 JSON을 Service로 전달하여 IssuePool 업데이트"""
        try:
            # Router에서 받은 JSON을 DTO로 변환
            issuepool_dto = IssuePoolDTO(
                corporation_id=request_data.corporation_id,
                publish_year=request_data.publish_year,
                ranking=request_data.ranking,
                issue_pool=request_data.issue_pool,
                category_id=request_data.category_id,
                esg_classification_id=request_data.esg_classification_id
            )
            
            # Service에 DTO 전달하여 업데이트
            updated_issuepool = await self.service.process_issuepool_update(issuepool_id, issuepool_dto)
            return updated_issuepool
            
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"IssuePool 업데이트 실패: {str(e)}")

    async def delete_issuepool(self, issuepool_id: int) -> Dict[str, str]:
        """IssuePool 삭제"""
        try:
            success = await self.service.delete_issuepool(issuepool_id)
            if success:
                return {"message": f"ID {issuepool_id}인 IssuePool이 성공적으로 삭제되었습니다."}
            else:
                raise HTTPException(status_code=404, detail=f"ID {issuepool_id}인 IssuePool을 찾을 수 없습니다.")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"IssuePool 삭제 실패: {str(e)}")

    async def get_issuepools_by_category(self, category_id: int, corporation_id: Optional[int] = None) -> List[IssuePool]:
        """카테고리 ID로 IssuePool 목록 조회"""
        try:
            issuepools = await self.service.get_issuepools_by_category(category_id, corporation_id)
            return issuepools
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"카테고리별 IssuePool 조회 실패: {str(e)}")

    async def get_issuepools_by_esg_classification(self, esg_classification_id: int, corporation_id: Optional[int] = None) -> List[IssuePool]:
        """ESG 분류로 IssuePool 목록 조회"""
        try:
            issuepools = await self.service.get_issuepools_by_esg_classification(esg_classification_id, corporation_id)
            return issuepools
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"ESG 분류별 IssuePool 조회 실패: {str(e)}")

    async def get_ranking_statistics(self, corporation_id: int, publish_year: str) -> Dict[str, Any]:
        """랭킹 통계 정보 조회"""
        try:
            statistics = await self.service.get_ranking_statistics(corporation_id, publish_year)
            return statistics
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"랭킹 통계 조회 실패: {str(e)}")

    async def bulk_create_issuepools(self, request_data: IssuePoolBulkCreateRequest) -> List[IssuePool]:
        """Router에서 받은 JSON 리스트를 Service로 전달하여 일괄 생성"""
        try:
            # Router에서 받은 JSON 리스트를 DTO 리스트로 변환
            issuepool_dtos = []
            for item in request_data.items:
                dto = IssuePoolDTO(
                    corporation_id=item.corporation_id,
                    publish_year=item.publish_year,
                    ranking=item.ranking,
                    issue_pool=item.issue_pool,
                    category_id=item.category_id,
                    esg_classification_id=item.esg_classification_id
                )
                issuepool_dtos.append(dto)
            
            # Service에 DTO 리스트 전달하여 일괄 생성
            created_issuepools = await self.service.bulk_create_issuepools(issuepool_dtos)
            return created_issuepools
            
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"IssuePool 일괄 생성 실패: {str(e)}")

    async def create_issuepool_list_response(self, session_key: str, thread_id: str, issuepools: List[IssuePool]) -> IssuePoolListResponse:
        """IssuePool 엔티티 리스트를 응답 DTO로 변환"""
        try:
            response = await self.service.create_issuepool_list_response(session_key, thread_id, issuepools)
            return response
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"응답 생성 실패: {str(e)}")

    def validate_request_data(self, request_data: Dict[str, Any]) -> bool:
        """Router에서 받은 JSON 데이터 유효성 검증"""
        try:
            # 필수 필드 존재 여부 확인
            required_fields = ['corporation_id', 'publish_year', 'ranking', 'issue_pool', 'category_id', 'esg_classification_id']
            for field in required_fields:
                if field not in request_data:
                    raise ValueError(f"필수 필드 '{field}'가 누락되었습니다.")
            
            # 데이터 타입 검증
            if not isinstance(request_data.get('corporation_id'), int):
                raise ValueError("corporation_id는 정수여야 합니다.")
            
            if not isinstance(request_data.get('publish_year'), str):
                raise HTTPException(status_code=400, detail="publish_year는 문자열이어야 합니다.")
            
            if not isinstance(request_data.get('ranking'), str):
                raise HTTPException(status_code=400, detail="ranking은 문자열이어야 합니다.")
            
            if not isinstance(request_data.get('issue_pool'), str):
                raise ValueError("issue_pool은 문자열이어야 합니다.")
            
            if not isinstance(request_data.get('category_id'), int):
                raise ValueError("category_id는 정수여야 합니다.")
            
            if not isinstance(request_data.get('esg_classification_id'), int):
                raise ValueError("esg_classification_id는 정수여야 합니다.")
            
            return True
        except Exception as e:
            raise ValueError(f"요청 데이터 유효성 검증 실패: {str(e)}")

    async def get_random_issuepools(self, limit: int = 10) -> List[IssuePoolDTO]:
        """랜덤으로 IssuePool 목록 조회"""
        try:
            issuepools = await self.service.get_random_issuepools(limit)
            
            # Pydantic v2의 model_validate를 사용하여 안전한 DTO 변환
            issuepool_dtos = []
            for issuepool in issuepools:
                try:
                    # from_attributes=True로 설정되어 있어서 SQLAlchemy 엔티티를 직접 변환 가능
                    dto = IssuePoolDTO.model_validate(issuepool, from_attributes=True)
                    issuepool_dtos.append(dto)
                except Exception as dto_error:
                    logger.error(f"DTO 변환 실패 - Entity ID {issuepool.id}: {str(dto_error)}")
                    logger.error(f"Entity 데이터: {issuepool.__dict__}")
                    raise dto_error
            
            return issuepool_dtos
        except Exception as e:
            logger.error(f"랜덤 IssuePool 조회 실패: {str(e)}")
            logger.error(f"에러 타입: {type(e).__name__}")
            import traceback
            logger.error(f"스택 트레이스: {traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"랜덤 IssuePool 조회 실패: {str(e)}"
            )


# FastAPI 의존성 주입을 위한 함수
def get_issuepool_controller(db: AsyncSession = Depends(get_db)) -> IssuePoolController:
    """IssuePoolController 인스턴스 생성 및 반환"""
    return IssuePoolController(db)
