"""
Issue Pool Router - FastAPI 라우터
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import logging

# 로거 설정
logger = logging.getLogger(__name__)

from app.domain.issuepool.schema import IssuePoolListRequest
from app.domain.issuepool.controller import issuepool_controller

# 라우터 생성
issuepool_router = APIRouter(prefix="/issuepool", tags=["IssuePool"])

@issuepool_router.post("/list", summary="지난 중대성 평가 목록 조회")
async def get_issuepool_list(request: Request):
    """
    지난 중대성 평가 목록 조회
    
    Args:
        request: 요청 데이터
            - company_id: 기업명 (문자열)
            - report_period: 보고기간 (start_date, end_date)
            - request_type: 요청 타입
            - timestamp: 타임스탬프
            - search_context: 검색 컨텍스트 (선택적)
    
    Returns:
        JSONResponse: 응답 데이터
    """
    logger.info("📊 지난 중대성 평가 목록 조회 POST 요청 받음")
    try:
        form_data = await request.json()
        logger.info(f"지난 중대성 평가 목록 조회 시도: {form_data.get('company_id', 'N/A')}")

        required_fields = ['company_id', 'report_period']
        missing_fields = [f for f in required_fields if not form_data.get(f)]
        if missing_fields:
            logger.warning(f"필수 필드 누락: {missing_fields}")
            return JSONResponse({
                "success": False, 
                "message": f"필수 필드가 누락되었습니다: {', '.join(missing_fields)}"
            })

        # report_period 내부 필드 검증
        report_period = form_data.get('report_period', {})
        period_required_fields = ['start_date', 'end_date']
        missing_period_fields = [f for f in period_required_fields if not report_period.get(f)]
        if missing_period_fields:
            logger.warning(f"보고기간 필수 필드 누락: {missing_period_fields}")
            return JSONResponse({
                "success": False, 
                "message": f"보고기간 필수 필드가 누락되었습니다: {', '.join(missing_period_fields)}"
            })

        logger.info("=== 지난 중대성 평가 목록 조회 요청 데이터 ===")
        logger.info(f"기업 ID: {form_data.get('company_id', 'N/A')}")
        logger.info(f"시작일: {report_period.get('start_date', 'N/A')}")
        logger.info(f"종료일: {report_period.get('end_date', 'N/A')}")
        logger.info(f"요청 타입: {form_data.get('request_type', 'N/A')}")
        logger.info(f"타임스탬프: {form_data.get('timestamp', 'N/A')}")
        logger.info("==========================================")

        # JSON을 IssuePoolListRequest BaseModel로 변환
        try:
            issuepool_request = IssuePoolListRequest(**form_data)
            logger.info(f"✅ 지난 중대성 평가 목록 조회 데이터 검증 성공: {issuepool_request.company_id}")
            
            # issuepool_controller로 BaseModel 전달
            result = await issuepool_controller.get_issuepool_list(issuepool_request)
            return JSONResponse(result)
                
        except Exception as validation_error:
            logger.error(f"지난 중대성 평가 목록 조회 데이터 검증 실패: {validation_error}")
            return JSONResponse({
                "success": False, 
                "message": f"입력 데이터가 올바르지 않습니다: {str(validation_error)}"
            })

    except Exception as e:
        logger.error(f"지난 중대성 평가 목록 조회 처리 중 오류: {str(e)}")
        return JSONResponse({
            "success": False, 
            "message": f"지난 중대성 평가 목록 조회 처리 중 오류가 발생했습니다: {str(e)}"
        })

@issuepool_router.get("/{issuepool_id}", summary="특정 이슈풀 조회")
async def get_issuepool_by_id(issuepool_id: int):
    """
    특정 이슈풀 조회
    
    Args:
        issuepool_id: 이슈풀 ID
    
    Returns:
        JSONResponse: 응답 데이터
    """
    logger.info(f"🔍 IssuePool ID 조회: {issuepool_id}")
    try:
        result = await issuepool_controller.get_issuepool_by_id(issuepool_id)
        return JSONResponse(result)
    except Exception as e:
        logger.error(f"❌ IssuePool ID 조회 중 오류: {str(e)}")
        return JSONResponse({
            "success": False,
            "message": f"이슈풀 조회 중 오류가 발생했습니다: {str(e)}"
        })

@issuepool_router.get("/corporation/{corporation_name}", summary="기업별 이슈풀 목록 조회")
async def get_issuepools_by_corporation(
    corporation_name: str,
    publish_year: int = None
):
    """
    기업별 이슈풀 목록 조회
    
    Args:
        corporation_name: 기업명
        publish_year: 발행년도 (선택적)
    
    Returns:
        JSONResponse: 응답 데이터
    """
    logger.info(f"🔍 기업별 IssuePool 조회: corporation_name={corporation_name}, year={publish_year}")
    try:
        result = await issuepool_controller.get_issuepools_by_corporation(
            corporation_name=corporation_name,
            publish_year=publish_year
        )
        return JSONResponse(result)
    except Exception as e:
        logger.error(f"❌ 기업별 IssuePool 조회 중 오류: {str(e)}")
        return JSONResponse({
            "success": False,
            "message": f"기업별 이슈풀 조회 중 오류가 발생했습니다: {str(e)}"
        })
