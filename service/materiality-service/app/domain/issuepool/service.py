"""
Issue Pool Service - 비즈니스 로직 및 데이터 처리
"""
import logging
from typing import Dict, Any, Optional
from app.domain.issuepool.schema import IssuePoolListRequest
from app.domain.issuepool.repository import IssuePoolRepository

logger = logging.getLogger(__name__)

class IssuePoolService:
    """이슈풀 서비스"""
    
    def __init__(self):
        self.repository = IssuePoolRepository()
    
    async def get_issuepool_list(self, request: IssuePoolListRequest) -> Dict[str, Any]:
        """
        지난 중대성 평가 목록 조회
        
        Args:
            request: 이슈풀 목록 조회 요청
            
        Returns:
            Dict[str, Any]: 응답 데이터
                - year_minus_2: year-2년 데이터 (첫 번째 섹션)
                - year_minus_1: year-1년 데이터 (두 번째 섹션)
        """
        try:
            logger.info(f"📊 서비스: 이슈풀 목록 조회 시작 - 기업: {request.company_id}")
            
            # 연도 추출 (YYYY-MM-DD 형식에서 YYYY 추출) 및 정수 변환
            try:
                base_year = int(request.report_period.start_date.split('-')[0])
                year_minus_2 = base_year - 2  # year-2년
                year_minus_1 = base_year - 1  # year-1년
            except (ValueError, IndexError):
                return {
                    "success": False,
                    "message": "올바른 날짜 형식이 아닙니다."
                }
            
            logger.info(f"🔍 서비스: 기업명: {request.company_id}, 기준연도: {base_year}")
            logger.info(f"🔍 서비스: year-2년: {year_minus_2}, year-1년: {year_minus_1}")
            
            # year-2년 데이터 조회 (첫 번째 섹션)
            issuepools_year_minus_2 = await self.repository.get_issuepools_by_corporation(
                corporation_name=request.company_id,  # 기업명으로 검색
                publish_year=year_minus_2
            )
            
            # year-1년 데이터 조회 (두 번째 섹션)
            issuepools_year_minus_1 = await self.repository.get_issuepools_by_corporation(
                corporation_name=request.company_id,  # 기업명으로 검색
                publish_year=year_minus_1
            )
            
            # ranking 순서대로 정렬
            sorted_issuepools_year_minus_2 = sorted(issuepools_year_minus_2, key=lambda x: x.ranking)
            sorted_issuepools_year_minus_1 = sorted(issuepools_year_minus_1, key=lambda x: x.ranking)
            
            # ESG 분포 계산 함수
            def calculate_esg_distribution(issuepools):
                """ESG 분류별 비율 계산"""
                esg_counts = {}
                total = len(issuepools)
                
                for issuepool in issuepools:
                    esg_name = issuepool.esg_classification_name or "미분류"
                    
                    # 지배구조와 지배구조/경제를 통합
                    if esg_name == "지배구조":
                        esg_name = "지배구조/경제"
                    
                    esg_counts[esg_name] = esg_counts.get(esg_name, 0) + 1
                
                # 비율(%)로 변환
                esg_distribution = {}
                for esg_name, count in esg_counts.items():
                    percentage = round((count / total) * 100) if total > 0 else 0
                    esg_distribution[esg_name] = {
                        "count": count,
                        "percentage": percentage
                    }
                
                return esg_distribution
            
            # year-2년과 year-1년 각각의 ESG 분포 계산
            esg_distribution_year_minus_2 = calculate_esg_distribution(sorted_issuepools_year_minus_2)
            esg_distribution_year_minus_1 = calculate_esg_distribution(sorted_issuepools_year_minus_1)
            
            # 응답 데이터 구성
            response_data = {
                "success": True,
                "message": "지난 중대성 평가 목록을 성공적으로 조회했습니다.",
                "data": {
                    "company_name": request.company_id,
                    "base_year": base_year,
                    "search_period": {
                        "start_date": request.report_period.start_date,
                        "end_date": request.report_period.end_date
                    },
                    "year_minus_2": {
                        "year": year_minus_2,
                        "total_count": len(sorted_issuepools_year_minus_2),
                        "issuepools": [
                            {
                                "id": issuepool.id,
                                "ranking": issuepool.ranking,
                                "base_issue_pool": issuepool.base_issue_pool,
                                "issue_pool": issuepool.issue_pool,
                                "category_id": issuepool.category_id,
                                "esg_classification_id": issuepool.esg_classification_id,
                                "esg_classification_name": issuepool.esg_classification_name
                            } for issuepool in sorted_issuepools_year_minus_2
                        ],
                        "esg_distribution": esg_distribution_year_minus_2
                    },
                    "year_minus_1": {
                        "year": year_minus_1,
                        "total_count": len(sorted_issuepools_year_minus_1),
                        "issuepools": [
                            {
                                "id": issuepool.id,
                                "ranking": issuepool.ranking,
                                "base_issue_pool": issuepool.base_issue_pool,
                                "issue_pool": issuepool.issue_pool,
                                "category_id": issuepool.category_id,
                                "esg_classification_id": issuepool.esg_classification_id,
                                "esg_classification_name": issuepool.esg_classification_name
                            } for issuepool in sorted_issuepools_year_minus_1
                        ],
                        "esg_distribution": esg_distribution_year_minus_1
                    },
                    "total_count": len(sorted_issuepools_year_minus_2) + len(sorted_issuepools_year_minus_1)
                }
            }
            
            logger.info(f"✅ 서비스: 이슈풀 목록 조회 완료")
            logger.info(f"   - year-2년 ({year_minus_2}): {len(sorted_issuepools_year_minus_2)}개 항목")
            logger.info(f"   - year-1년 ({year_minus_1}): {len(sorted_issuepools_year_minus_1)}개 항목")
            logger.info(f"   - 총 {len(sorted_issuepools_year_minus_2) + len(sorted_issuepools_year_minus_1)}개 항목")
            
            return response_data
            
        except Exception as e:
            logger.error(f"❌ 서비스: 이슈풀 목록 조회 중 오류: {str(e)}")
            return {
                "success": False,
                "message": f"이슈풀 목록 조회 중 오류가 발생했습니다: {str(e)}"
            }
    
    async def get_issuepool_by_id(self, issuepool_id: int) -> Dict[str, Any]:
        """
        특정 이슈풀 조회
        
        Args:
            issuepool_id: 이슈풀 ID
            
        Returns:
            Dict[str, Any]: 응답 데이터
        """
        try:
            logger.info(f"🔍 서비스: 이슈풀 ID 조회 시작 - ID: {issuepool_id}")
            
            issuepool = await self.repository.find_issuepool_by_id(issuepool_id)
            
            if not issuepool:
                return {
                    "success": False,
                    "message": f"ID {issuepool_id}의 이슈풀을 찾을 수 없습니다."
                }
            
            response_data = {
                "success": True,
                "message": "이슈풀을 성공적으로 조회했습니다.",
                "data": {
                    "id": issuepool.id,
                    "corporation_id": issuepool.corporation_id,
                    "publish_year": issuepool.publish_year,
                    "ranking": issuepool.ranking,
                    "base_issue_pool": issuepool.base_issue_pool,
                    "issue_pool": issuepool.issue_pool,
                    "category_id": issuepool.category_id,
                    "esg_classification_id": issuepool.esg_classification_id,
                    "esg_classification_name": issuepool.esg_classification_name
                }
            }
            
            logger.info(f"✅ 서비스: 이슈풀 ID 조회 완료 - ID: {issuepool_id}")
            return response_data
            
        except Exception as e:
            logger.error(f"❌ 서비스: 이슈풀 ID 조회 중 오류: {str(e)}")
            return {
                "success": False,
                "message": f"이슈풀 조회 중 오류가 발생했습니다: {str(e)}"
            }
    
    async def get_issuepools_by_corporation(
        self, 
        corporation_name: str, 
        publish_year: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        기업별 이슈풀 목록 조회
        
        Args:
            corporation_name: 기업명
            publish_year: 발행년도 (선택적)
            
        Returns:
            Dict[str, Any]: 응답 데이터
        """
        try:
            logger.info(f"🔍 서비스: 기업별 이슈풀 조회 시작 - 기업: {corporation_name}, 연도: {publish_year}")
            
            issuepools = await self.repository.get_issuepools_by_corporation(
                corporation_id=corporation_name,
                publish_year=publish_year
            )
            
            # ranking 순서대로 정렬
            sorted_issuepools = sorted(issuepools, key=lambda x: x.ranking)
            
            response_data = {
                "success": True,
                "message": "기업별 이슈풀 목록을 성공적으로 조회했습니다.",
                "data": {
                    "total_count": len(sorted_issuepools),
                    "issuepools": [
                        {
                            "id": issuepool.id,
                            "ranking": issuepool.ranking,
                            "base_issue_pool": issuepool.base_issue_pool,
                            "issue_pool": issuepool.issue_pool,
                            "category_id": issuepool.category_id,
                            "esg_classification_id": issuepool.esg_classification_id,
                            "esg_classification_name": issuepool.esg_classification_name
                        } for issuepool in sorted_issuepools
                    ],
                    "corporation_name": corporation_name,
                    "publish_year": publish_year
                }
            }
            
            logger.info(f"✅ 서비스: 기업별 이슈풀 조회 완료 - {len(sorted_issuepools)}개 항목")
            return response_data
            
        except Exception as e:
            logger.error(f"❌ 서비스: 기업별 이슈풀 조회 중 오류: {str(e)}")
            return {
                "success": False,
                "message": f"기업별 이슈풀 조회 중 오류가 발생했습니다: {str(e)}"
            }

# 서비스 인스턴스 생성
issuepool_service = IssuePoolService()
