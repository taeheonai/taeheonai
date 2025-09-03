"""
설문 컨트롤러 (서비스 호출 역할)
"""
import logging
from typing import List, Optional, Dict, Any

from app.domain.survey.schema import (
    SurveyCreateRequest, 
    SurveyResponseRequest, 
    SurveyDataResponse,
    SurveyResponsesResponse,
    SurveyListResponse
)
from app.domain.survey.service import SurveyService

logger = logging.getLogger(__name__)

class SurveyController:
    """설문 컨트롤러 - 서비스 호출 및 데이터 변환 담당"""
    
    def __init__(self):
        """컨트롤러 초기화"""
        self.service = SurveyService()
    
    async def create_survey(self, request: SurveyCreateRequest) -> SurveyDataResponse:
        """설문 생성 - 서비스 호출"""
        try:
            logger.info(f"🔍 컨트롤러: 설문 생성 요청을 Service로 전달 - {request.corporation_id}")
            
            # BaseModel을 Service로 전달 (데이터베이스 연결 없음)
            result = await self.service.create_survey(request)
            
            logger.info(f"✅ 컨트롤러: Service 응답 수신 - {result.survey_id}")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: Service 호출 중 오류 - {str(e)}")
            raise
    
    async def get_survey(self, survey_id: str) -> Optional[SurveyDataResponse]:
        """설문 조회 - 서비스 호출"""
        try:
            logger.info(f"🔍 컨트롤러: 설문 조회 요청을 Service로 전달 - {survey_id}")
            
            # survey_id를 Service로 전달 (데이터베이스 연결 없음)
            result = await self.service.get_survey(survey_id)
            
            logger.info(f"✅ 컨트롤러: Service 응답 수신 - {result.survey_id if result else 'Not found'}")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: Service 호출 중 오류 - {str(e)}")
            raise
    
    async def get_surveys_by_corporation(self, corporation_id: str) -> List[SurveyDataResponse]:
        """회사별 설문 목록 조회 - 서비스 호출"""
        try:
            logger.info(f"🔍 컨트롤러: 회사별 설문 조회 요청을 Service로 전달 - {corporation_id}")
            
            # corporation_id를 Service로 전달 (데이터베이스 연결 없음)
            result = await self.service.get_surveys_by_corporation(corporation_id)
            
            logger.info(f"✅ 컨트롤러: Service 응답 수신 - {len(result)}개 설문")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: Service 호출 중 오류 - {str(e)}")
            raise
    
    async def submit_survey_response(self, request: SurveyResponseRequest) -> Dict[str, Any]:
        """설문 응답 제출 - 서비스 호출"""
        try:
            logger.info(f"🔍 컨트롤러: 설문 응답 제출 요청을 Service로 전달 - {request.survey_id}")
            
            # BaseModel을 Service로 전달 (데이터베이스 연결 없음)
            result = await self.service.submit_survey_response(request)
            
            logger.info(f"✅ 컨트롤러: Service 응답 수신 - {result.get('message', 'Unknown')}")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: Service 호출 중 오류 - {str(e)}")
            raise
    
    async def get_survey_responses(self, survey_id: str) -> SurveyResponsesResponse:
        """설문 응답 목록 조회 - 서비스 호출"""
        try:
            logger.info(f"🔍 컨트롤러: 설문 응답 목록 조회 요청을 Service로 전달 - {survey_id}")
            
            # survey_id를 Service로 전달 (데이터베이스 연결 없음)
            result = await self.service.get_survey_responses(survey_id)
            
            logger.info(f"✅ 컨트롤러: Service 응답 수신 - {result.total_responses}개 응답")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: Service 호출 중 오류 - {str(e)}")
            raise
    
    async def get_survey_responses_by_content_hash(self, content_hash: str) -> SurveyResponsesResponse:
        """동일한 내용 해시를 가진 설문들의 모든 응답 조회 - 서비스 호출"""
        try:
            logger.info(f"🔍 컨트롤러: 내용 해시별 설문 응답 목록 조회 요청을 Service로 전달 - {content_hash}")
            
            # content_hash를 Service로 전달 (데이터베이스 연결 없음)
            result = await self.service.get_survey_responses_by_content_hash(content_hash)
            
            logger.info(f"✅ 컨트롤러: Service 응답 수신 - {result.total_responses}개 응답")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: Service 호출 중 오류 - {str(e)}")
            raise
    
    async def get_all_surveys(self) -> SurveyListResponse:
        """모든 설문 목록 조회 - 서비스 호출"""
        try:
            logger.info("🔍 컨트롤러: 모든 설문 목록 조회 요청을 Service로 전달")
            
            # Service로 전달 (데이터베이스 연결 없음)
            result = await self.service.get_all_surveys()
            
            logger.info(f"✅ 컨트롤러: Service 응답 수신 - {result.total_count}개 설문")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: Service 호출 중 오류 - {str(e)}")
            raise
    
    async def delete_survey(self, survey_id: str) -> bool:
        """설문 삭제 - 서비스 호출"""
        try:
            logger.info(f"🔍 컨트롤러: 설문 삭제 요청을 Service로 전달 - {survey_id}")
            
            # survey_id를 Service로 전달 (데이터베이스 연결 없음)
            result = await self.service.delete_survey(survey_id)
            
            logger.info(f"✅ 컨트롤러: Service 응답 수신 - {result}")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: Service 호출 중 오류 - {str(e)}")
            raise
