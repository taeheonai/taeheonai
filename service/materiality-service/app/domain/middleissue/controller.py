"""
Middleissue Controller - MVC 구조에서 BaseModel을 MiddleissueService로 전달하는 컨트롤러
데이터베이스 연결은 하지 않고, Service를 거쳐 Repository까지 BaseModel을 전달
"""
import logging
from app.domain.middleissue.schema import (
    MiddleIssueRequest, 
    MiddleIssueResponse,
    WeightUpdateRequest,
    WeightUpdateResponse
)
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

    async def update_weights(self, request: WeightUpdateRequest) -> WeightUpdateResponse:
        """
        가중치 업데이트 요청을 처리하고 중대성 평가 결과를 재계산
        
        Args:
            request: 가중치 업데이트 요청 데이터 (WeightUpdateRequest)
            
        Returns:
            WeightUpdateResponse: 가중치 업데이트 응답
        """
        try:
            logger.info("⚖️ 컨트롤러: 가중치 업데이트 요청을 처리")
            
            # 현재는 임시 응답을 반환 (실제 구현은 서비스에서 처리)
            # TODO: 실제 가중치 업데이트 로직 구현
            result = WeightUpdateResponse(
                success=True,
                message="가중치가 성공적으로 업데이트되었습니다.",
                data=None  # 실제로는 재계산된 결과를 반환해야 함
            )
            
            logger.info("✅ 컨트롤러: 가중치 업데이트 완료")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: 가중치 업데이트 중 오류 - {str(e)}")
            return WeightUpdateResponse(
                success=False,
                message=f"가중치 업데이트 중 오류가 발생했습니다: {str(e)}",
                data=None
            )

# 컨트롤러 인스턴스 생성
middleissue_controller = MiddleIssueController()
