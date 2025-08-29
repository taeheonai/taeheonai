# app/domain/service/issuepool_service.py
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.domain.repository.issuepool_repository import IssuePoolRepository
from app.domain.schema.issuepool_schema import IssuePoolDTO, IssuePoolFilter, IssuePoolListResponse
from app.domain.entity.issuepool_entity import IssuePool


class IssuePoolService:
    def __init__(self, db: Session):
        self.repository = IssuePoolRepository(db)

    def create_issuepool(self, issuepool_dto: IssuePoolDTO) -> IssuePool:
        """Controller로부터 받은 DTO를 Repository에 전달하여 IssuePool 생성"""
        try:
            # Repository를 통해 DTO를 Entity로 변환하여 생성
            created_issuepool = self.repository.create(issuepool_dto)
            return created_issuepool
        except Exception as e:
            raise Exception(f"IssuePool 생성 실패: {str(e)}")

    def get_issuepool_by_id(self, issuepool_id: int) -> Optional[IssuePool]:
        """ID로 IssuePool 조회"""
        try:
            return self.repository.get_by_id(issuepool_id)
        except Exception as e:
            raise Exception(f"IssuePool 조회 실패: {str(e)}")

    def get_issuepools_by_corporation_and_year(self, corporation_id: int, publish_year: int) -> List[IssuePool]:
        """기업 ID와 발행 연도로 IssuePool 목록 조회"""
        try:
            return self.repository.get_by_corporation_and_year(corporation_id, publish_year)
        except Exception as e:
            raise Exception(f"IssuePool 목록 조회 실패: {str(e)}")

    def get_filtered_issuepools(self, filter_dto: IssuePoolFilter) -> List[IssuePool]:
        """필터 조건에 따른 IssuePool 목록 조회"""
        try:
            return self.repository.get_filtered(filter_dto)
        except Exception as e:
            raise Exception(f"필터링된 IssuePool 조회 실패: {str(e)}")

    def update_issuepool(self, issuepool_id: int, issuepool_dto: IssuePoolDTO) -> Optional[IssuePool]:
        """Controller로부터 받은 DTO를 Repository에 전달하여 IssuePool 업데이트"""
        try:
            # Repository를 통해 DTO를 Entity로 변환하여 업데이트
            updated_issuepool = self.repository.update(issuepool_id, issuepool_dto)
            if not updated_issuepool:
                raise Exception(f"ID {issuepool_id}인 IssuePool을 찾을 수 없습니다.")
            return updated_issuepool
        except Exception as e:
            raise Exception(f"IssuePool 업데이트 실패: {str(e)}")

    def delete_issuepool(self, issuepool_id: int) -> bool:
        """IssuePool 삭제"""
        try:
            success = self.repository.delete(issuepool_id)
            if not success:
                raise Exception(f"ID {issuepool_id}인 IssuePool을 찾을 수 없습니다.")
            return success
        except Exception as e:
            raise Exception(f"IssuePool 삭제 실패: {str(e)}")

    def get_issuepools_by_category(self, category_id: int, corporation_id: Optional[int] = None) -> List[IssuePool]:
        """카테고리 ID로 IssuePool 목록 조회"""
        try:
            return self.repository.get_by_category(category_id, corporation_id)
        except Exception as e:
            raise Exception(f"카테고리별 IssuePool 조회 실패: {str(e)}")

    def get_issuepools_by_esg_classification(self, esg_classification_id: int, corporation_id: Optional[int] = None) -> List[IssuePool]:
        """ESG 분류로 IssuePool 목록 조회"""
        try:
            return self.repository.get_by_esg_classification(esg_classification_id, corporation_id)
        except Exception as e:
            raise Exception(f"ESG 분류별 IssuePool 조회 실패: {str(e)}")

    def get_ranking_statistics(self, corporation_id: int, publish_year: int) -> Dict[str, Any]:
        """랭킹 통계 정보 조회"""
        try:
            return self.repository.get_ranking_statistics(corporation_id, publish_year)
        except Exception as e:
            raise Exception(f"랭킹 통계 조회 실패: {str(e)}")

    def bulk_create_issuepools(self, issuepool_dtos: List[IssuePoolDTO]) -> List[IssuePool]:
        """Controller로부터 받은 DTO 리스트를 Repository에 전달하여 일괄 생성"""
        try:
            if not issuepool_dtos:
                raise Exception("생성할 IssuePool 데이터가 없습니다.")
            
            # Repository를 통해 DTO들을 Entity로 변환하여 일괄 생성
            created_issuepools = self.repository.bulk_create(issuepool_dtos)
            return created_issuepools
        except Exception as e:
            raise Exception(f"IssuePool 일괄 생성 실패: {str(e)}")

    def create_issuepool_list_response(self, session_key: str, thread_id: str, issuepools: List[IssuePool]) -> IssuePoolListResponse:
        """IssuePool 엔티티 리스트를 DTO로 변환하여 응답 생성"""
        try:
            # Entity를 DTO로 변환
            issuepool_dtos = []
            for issuepool in issuepools:
                dto = IssuePoolDTO(
                    id=issuepool.id,
                    corporation_id=issuepool.corporation_id,
                    publish_year=issuepool.publish_year,
                    ranking=issuepool.ranking,
                    issue_pool=issuepool.issue_pool,
                    category_id=issuepool.category_id,
                    esg_classification_id=issuepool.esg_classification_id
                )
                issuepool_dtos.append(dto)
            
            return IssuePoolListResponse(
                session_key=session_key,
                thread_id=thread_id,
                items=issuepool_dtos
            )
        except Exception as e:
            raise Exception(f"응답 생성 실패: {str(e)}")

    def validate_issuepool_data(self, issuepool_dto: IssuePoolDTO) -> bool:
        """DTO 데이터 유효성 검증"""
        try:
            # 필수 필드 검증
            if not issuepool_dto.corporation_id or issuepool_dto.corporation_id <= 0:
                raise ValueError("유효하지 않은 corporation_id입니다.")
            
            if not issuepool_dto.publish_year or issuepool_dto.publish_year < 1900:
                raise ValueError("유효하지 않은 publish_year입니다.")
            
            if not issuepool_dto.ranking or issuepool_dto.ranking <= 0:
                raise ValueError("유효하지 않은 ranking입니다.")
            
            if not issuepool_dto.issue_pool or not issuepool_dto.issue_pool.strip():
                raise ValueError("issue_pool은 비어있을 수 없습니다.")
            
            if not issuepool_dto.category_id or issuepool_dto.category_id <= 0:
                raise ValueError("유효하지 않은 category_id입니다.")
            
            if issuepool_dto.esg_classification_id not in [1, 2, 3]:
                raise ValueError("esg_classification_id는 1, 2, 3 중 하나여야 합니다.")
            
            return True
        except Exception as e:
            raise ValueError(f"데이터 유효성 검증 실패: {str(e)}")

    def process_issuepool_creation(self, issuepool_dto: IssuePoolDTO) -> IssuePool:
        """IssuePool 생성 프로세스 (검증 → 생성)"""
        try:
            # 1단계: 데이터 유효성 검증
            self.validate_issuepool_data(issuepool_dto)
            
            # 2단계: Repository를 통해 생성
            created_issuepool = self.create_issuepool(issuepool_dto)
            
            return created_issuepool
        except Exception as e:
            raise Exception(f"IssuePool 생성 프로세스 실패: {str(e)}")

    def process_issuepool_update(self, issuepool_id: int, issuepool_dto: IssuePoolDTO) -> IssuePool:
        """IssuePool 업데이트 프로세스 (검증 → 업데이트)"""
        try:
            # 1단계: 데이터 유효성 검증
            self.validate_issuepool_data(issuepool_dto)
            
            # 2단계: Repository를 통해 업데이트
            updated_issuepool = self.update_issuepool(issuepool_id, issuepool_dto)
            
            return updated_issuepool
        except Exception as e:
            raise Exception(f"IssuePool 업데이트 프로세스 실패: {str(e)}")
