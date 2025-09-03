"""
Middleissue Controller - MVC 구조에서 BaseModel을 MiddleissueService로 전달하는 컨트롤러
데이터베이스 연결은 하지 않고, Service를 거쳐 Repository까지 BaseModel을 전달
"""
import logging
from app.domain.middleissue.schema import MiddleIssueRequest, MiddleIssueResponse
from app.domain.middleissue.service import start_assessment_with_timeout

logger = logging.getLogger(__name__)

class MiddleIssueController:
    """중대성 평가 컨트롤러 - MVC 구조에서 BaseModel을 Service로 전달"""
    
    def __init__(self):
        pass
    
    async def start_assessment(self, request: MiddleIssueRequest) -> MiddleIssueResponse:
        """
        중대성 평가 시작 요청을 MiddleissueService로 전달 (타임아웃 적용)
        
        Args:
            request: 중대성 평가 시작 요청 데이터 (MiddleIssueRequest)
            
        Returns:
            MiddleIssueResponse: 중대성 평가 시작 응답
        """
        try:
            logger.info(f"🔍 컨트롤러: 중대성 평가 시작 요청을 Service로 전달 - 기업: {request.company_id}")
            
            # Service로 요청 전달 (타임아웃 5분 적용)
            result = await start_assessment_with_timeout(request, timeout_seconds=300)
            
            logger.info(f"✅ 컨트롤러: Service 응답 수신 - {result.get('success', False)}")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: Service 호출 중 오류 - {str(e)}")
            raise

# 컨트롤러 인스턴스 생성
middleissue_controller = MiddleIssueController()
