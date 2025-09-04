# app/domain/service/issuepool_service.py
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.repository.issuepool_repository import IssuePoolRepository
from app.domain.schema.issuepool_schema import IssuePoolDTO, IssuePoolFilter, IssuePoolListResponse
from app.domain.entity.issuepool_entity import IssuePool
import logging
import traceback
from fastapi import HTTPException

logger = logging.getLogger(__name__)


class IssuePoolService:
    def __init__(self, db: AsyncSession):
        self.repository = IssuePoolRepository(db)

    async def create_issuepool(self, issuepool_dto: IssuePoolDTO) -> IssuePool:
        """Controller로부터 받은 DTO를 Repository에 전달하여 IssuePool 생성"""
        try:
            # Repository를 통해 DTO를 Entity로 변환하여 생성
            created_issuepool = await self.repository.create(issuepool_dto)
            return created_issuepool
        except Exception as e:
            raise Exception(f"IssuePool 생성 실패: {str(e)}")

    async def get_issuepool_by_id(self, issuepool_id: int) -> Optional[IssuePool]:
        """ID로 IssuePool 조회"""
        try:
            return await self.repository.get_by_id(issuepool_id)
        except Exception as e:
            raise Exception(f"IssuePool 조회 실패: {str(e)}")

    async def get_issuepools_by_corporation_and_year(self, corporation_id: int, publish_year: str) -> List[IssuePool]:
        """특정 기업의 특정 연도 IssuePool 조회"""
        try:
            return await self.repository.get_by_corporation_and_year(corporation_id, publish_year)
        except Exception as e:
            logger.error(f"기업별 연도별 IssuePool 조회 실패: {e}")
            raise HTTPException(status_code=500, detail="기업별 연도별 IssuePool 조회에 실패했습니다.")

    async def get_filtered_issuepools(self, filter_dto: IssuePoolFilter) -> List[IssuePool]:
        """필터 조건에 따른 IssuePool 목록 조회"""
        try:
            return await self.repository.get_filtered(filter_dto)
        except Exception as e:
            raise Exception(f"필터링된 IssuePool 조회 실패: {str(e)}")

    async def update_issuepool(self, issuepool_id: int, issuepool_dto: IssuePoolDTO) -> Optional[IssuePool]:
        """Controller로부터 받은 DTO를 Repository에 전달하여 IssuePool 업데이트"""
        try:
            # Repository를 통해 DTO를 Entity로 변환하여 업데이트
            updated_issuepool = await self.repository.update(issuepool_id, issuepool_dto)
            if not updated_issuepool:
                raise Exception(f"ID {issuepool_id}인 IssuePool을 찾을 수 없습니다.")
            return updated_issuepool
        except Exception as e:
            raise Exception(f"IssuePool 업데이트 실패: {str(e)}")

    async def delete_issuepool(self, issuepool_id: int) -> bool:
        """IssuePool 삭제"""
        try:
            success = await self.repository.delete(issuepool_id)
            if not success:
                raise Exception(f"ID {issuepool_id}인 IssuePool을 찾을 수 없습니다.")
            return success
        except Exception as e:
            raise Exception(f"IssuePool 삭제 실패: {str(e)}")

    async def get_issuepools_by_category(self, category_id: int, corporation_id: Optional[int] = None) -> List[IssuePool]:
        """카테고리 ID로 IssuePool 목록 조회"""
        try:
            return await self.repository.get_by_category(category_id, corporation_id)
        except Exception as e:
            raise Exception(f"카테고리별 IssuePool 조회 실패: {str(e)}")

    async def get_issuepools_by_esg_classification(self, esg_classification_id: int, corporation_id: Optional[int] = None) -> List[IssuePool]:
        """ESG 분류로 IssuePool 목록 조회"""
        try:
            return await self.repository.get_by_esg_classification(esg_classification_id, corporation_id)
        except Exception as e:
            raise Exception(f"ESG 분류별 IssuePool 조회 실패: {str(e)}")

    async def get_ranking_statistics(self, corporation_id: int, publish_year: str) -> Dict[str, Any]:
        """특정 기업의 특정 연도 랭킹 통계 조회"""
        try:
            return await self.repository.get_ranking_statistics(corporation_id, publish_year)
        except Exception as e:
            logger.error(f"랭킹 통계 조회 실패: {e}")
            raise HTTPException(status_code=500, detail="랭킹 통계 조회에 실패했습니다.")

    async def bulk_create_issuepools(self, issuepool_dtos: List[IssuePoolDTO]) -> List[IssuePool]:
        """Controller로부터 받은 DTO 리스트를 Repository에 전달하여 일괄 생성"""
        try:
            if not issuepool_dtos:
                raise Exception("생성할 IssuePool 데이터가 없습니다.")
            
            # Repository를 통해 DTO들을 Entity로 변환하여 일괄 생성
            created_issuepools = await self.repository.bulk_create(issuepool_dtos)
            return created_issuepools
        except Exception as e:
            raise Exception(f"IssuePool 일괄 생성 실패: {str(e)}")

    async def create_issuepool_list_response(self, session_key: str, thread_id: str, issuepools: List[IssuePool]) -> IssuePoolListResponse:
        """IssuePool 엔티티 리스트를 DTO로 변환하여 응답 생성"""
        try:
            # Pydantic v2의 model_validate를 사용하여 안전한 DTO 변환
            issuepool_dtos = []
            for issuepool in issuepools:
                dto = IssuePoolDTO.model_validate(issuepool, from_attributes=True)
                issuepool_dtos.append(dto)
            
            # 응답 DTO 생성
            response = IssuePoolListResponse(
                session_key=session_key,
                thread_id=thread_id,
                issuepools=issuepool_dtos
            )
            return response
        except Exception as e:
            raise Exception(f"응답 생성 실패: {str(e)}")

    async def get_random_issuepools(self, limit: int = 10) -> List[IssuePool]:
        """랜덤으로 IssuePool 목록 조회"""
        try:
            logger.info(f"랜덤 IssuePool 조회 시작: limit={limit}")
            result = await self.repository.get_random_issuepools(limit)
            logger.info(f"랜덤 IssuePool 조회 완료: {len(result)}개")
            return result
        except Exception as e:
            logger.error(f"랜덤 IssuePool 조회 실패: {str(e)}")
            logger.error(f"에러 타입: {type(e).__name__}")
            import traceback
            logger.error(f"스택 트레이스: {traceback.format_exc()}")
            raise Exception(f"랜덤 IssuePool 조회 실패: {str(e)}")

    async def process_issuepool_creation(self, issuepool_dto: IssuePoolDTO) -> IssuePool:
        """IssuePool 생성 처리"""
        return await self.repository.process_issuepool_creation(issuepool_dto)

    async def process_issuepool_update(self, issuepool_id: int, issuepool_dto: IssuePoolDTO) -> Optional[IssuePool]:
        """IssuePool 업데이트 처리"""
        return await self.repository.process_issuepool_update(issuepool_id, issuepool_dto)
