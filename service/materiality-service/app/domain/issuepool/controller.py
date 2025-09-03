"""
Issue Pool Controller - 비즈니스 로직 처리
"""
import logging
from typing import Dict, Any, Optional
from app.domain.issuepool.schema import IssuePoolListRequest
from app.domain.issuepool.service import issuepool_service

logger = logging.getLogger(__name__)

class IssuePoolController:
    """이슈풀 컨트롤러"""
    
    async def get_issuepool_list(self, request: IssuePoolListRequest) -> Dict[str, Any]:
        """
        지난 중대성 평가 목록 조회
        
        Args:
            request: 이슈풀 목록 조회 요청
            
        Returns:
            Dict[str, Any]: 응답 데이터
        """
        try:
            logger.info(f"📊 컨트롤러: 이슈풀 목록 조회 시작 - 기업: {request.company_id}")
            
            # 서비스 계층으로 요청 전달
            result = await issuepool_service.get_issuepool_list(request)
            
            logger.info(f"✅ 컨트롤러: 이슈풀 목록 조회 완료 - {result.get('data', {}).get('total_count', 0)}개 항목")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: 이슈풀 목록 조회 중 오류: {str(e)}")
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
            logger.info(f"🔍 컨트롤러: 이슈풀 ID 조회 시작 - ID: {issuepool_id}")
            
            # 서비스 계층으로 요청 전달
            result = await issuepool_service.get_issuepool_by_id(issuepool_id)
            
            logger.info(f"✅ 컨트롤러: 이슈풀 ID 조회 완료 - ID: {issuepool_id}")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: 이슈풀 ID 조회 중 오류: {str(e)}")
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
            logger.info(f"🔍 컨트롤러: 기업별 이슈풀 조회 시작 - 기업: {corporation_name}, 연도: {publish_year}")
            
            # 서비스 계층으로 요청 전달
            result = await issuepool_service.get_issuepools_by_corporation(
                corporation_name=corporation_name,
                publish_year=publish_year
            )
            
            logger.info(f"✅ 컨트롤러: 기업별 이슈풀 조회 완료 - 기업: {corporation_name}")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: 기업별 이슈풀 조회 중 오류: {str(e)}")
            return {
                "success": False,
                "message": f"기업별 이슈풀 조회 중 오류가 발생했습니다: {str(e)}"
            }

# 컨트롤러 인스턴스 생성
issuepool_controller = IssuePoolController()
