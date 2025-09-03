"""
설문 관련 라우터
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Optional

from app.domain.survey.schema import (
    SurveyCreateRequest,
    SurveyResponseRequest,
    SurveyDataResponse,
    SurveyResponsesResponse,
    SurveyListResponse
)
from app.domain.survey.controller import SurveyController

logger = logging.getLogger(__name__)

# 설문 컨트롤러 인스턴스 생성
survey_controller = SurveyController()

# 설문 라우터 생성
survey_router = APIRouter()

@survey_router.post("/surveys", response_model=SurveyDataResponse)
async def create_survey(survey_request: SurveyCreateRequest):
    """설문 생성"""
    try:
        logger.info("🔍 설문 생성 POST 요청 받음")
        
        # 데이터 검증
        if not survey_request.corporation_id:
            raise HTTPException(status_code=400, detail="corporation_id가 필요합니다")
        
        result = await survey_controller.create_survey(survey_request)
        logger.info(f"설문 생성 성공: {result.survey_id}")
        return result
            
    except ValueError as e:
        # 데이터 에러 → 400
        logger.error(f"설문 생성 실패 (ValueError): {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        # 스키마/접근 에러 → 400으로 내려 사용자에게 힌트
        logger.error(f"설문 생성 실패 (RuntimeError): {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # 진짜 서버 오류만 500
        logger.exception("설문 생성 실패")
        raise HTTPException(status_code=500, detail="internal_error")

@survey_router.get("/surveys/{survey_id}", response_model=SurveyDataResponse)
async def get_survey(survey_id: str):
    """설문 조회"""
    try:
        logger.info(f"설문 조회 요청: {survey_id}")
        
        result = await survey_controller.get_survey(survey_id)
        if not result:
            raise HTTPException(status_code=404, detail="설문을 찾을 수 없습니다.")
        return result
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"설문 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@survey_router.get("/surveys/corporation/{corporation_id}", response_model=List[SurveyDataResponse])
async def get_surveys_by_corporation(corporation_id: str):
    """회사별 설문 목록 조회"""
    try:
        logger.info(f"회사별 설문 조회 요청: {corporation_id}")
        
        result = await survey_controller.get_surveys_by_corporation(corporation_id)
        return result
            
    except Exception as e:
        logger.error(f"회사별 설문 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@survey_router.post("/surveys/{survey_id}/responses")
async def submit_survey_response(survey_id: str, survey_response_request: SurveyResponseRequest):
    """설문 응답 제출"""
    try:
        logger.info(f"🔍 설문 응답 제출 POST 요청 받음: {survey_id}")
        
        # survey_id 일치 확인
        if survey_response_request.survey_id != survey_id:
            raise HTTPException(status_code=400, detail="설문 ID가 일치하지 않습니다.")
        
        result = await survey_controller.submit_survey_response(survey_response_request)
        return result
            
    except ValueError as e:
        logger.warning(f"중복 응답 시도: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"설문 응답 제출 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@survey_router.get("/surveys/{survey_id}/responses", response_model=SurveyResponsesResponse)
async def get_survey_responses(survey_id: str, content_hash: Optional[str] = None):
    """설문 응답 목록 조회 (content_hash가 있으면 동일한 내용의 설문들 포함)"""
    try:
        logger.info(f"설문 응답 목록 조회 요청: {survey_id}, content_hash: {content_hash}")
        
        if content_hash:
            # 동일한 내용 해시를 가진 설문들의 모든 응답 조회
            result = await survey_controller.get_survey_responses_by_content_hash(content_hash)
        else:
            # 기존 방식: 단일 설문의 응답만 조회
            result = await survey_controller.get_survey_responses(survey_id)
        
        return result
            
    except Exception as e:
        logger.error(f"설문 응답 목록 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@survey_router.get("/surveys", response_model=SurveyListResponse)
async def get_all_surveys():
    """모든 설문 목록 조회"""
    try:
        logger.info("모든 설문 목록 조회 요청")
        
        result = await survey_controller.get_all_surveys()
        return result
            
    except Exception as e:
        logger.error(f"모든 설문 목록 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@survey_router.delete("/surveys/{survey_id}")
async def delete_survey(survey_id: str):
    """설문 삭제"""
    try:
        logger.info(f"설문 삭제 요청: {survey_id}")
        
        result = await survey_controller.delete_survey(survey_id)
        if not result:
            raise HTTPException(status_code=404, detail="설문을 찾을 수 없습니다.")
        return {"message": "설문이 성공적으로 삭제되었습니다."}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"설문 삭제 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@survey_router.get("/health")
async def health_check():
    """설문 서비스 헬스 체크"""
    return {
        "status": "healthy",
        "service": "survey-service",
        "message": "설문 서비스가 정상적으로 작동 중입니다."
    }
