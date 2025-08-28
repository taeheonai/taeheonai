from typing import Optional
from datetime import datetime
import httpx
import logging
from fastapi import HTTPException
from app.domain.service.polish_service import PolishService
from app.domain.schema.polish_schema import (
    PolishRequest,
    PolishResponse,
    PolishCreate
)
from app.common.config import get_settings

logger = logging.getLogger(__name__)

async def call_llm(payload: dict) -> dict:
    """LLM 서비스 호출 함수"""
    s = get_settings()
    headers = {
        "Content-Type": "application/json",
        "x-api-key": s.service_api_key.strip()
    }
    try:
        async with httpx.AsyncClient(base_url=str(s.llm_service_url), timeout=s.llm_service_timeout) as client:
            response = await client.post("/v1/polish", json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"LLM 서비스 오류: {e.response.status_code} - {e.response.text}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"LLM 서비스 오류: {e.response.text}"
        )
    except httpx.RequestError as e:
        logger.error(f"LLM 서비스 연결 오류: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail="LLM 서비스에 연결할 수 없습니다"
        )

class PolishController:
    def __init__(self):
        self.service = PolishService()

    async def polish_answers(self, request: PolishRequest) -> PolishResponse:
        """GRI 답변 윤문 처리"""
        try:
            # 기존 윤문 결과 조회
            existing = await self.service.get_polish(
                session_key=request.session_key,
                gri_index=request.gri_index
            )
            
            if existing:
                return existing

            # LLM 서비스 호출하여 윤문 처리
            logger.info(f"LLM 서비스 호출: session_key={request.session_key}, gri_index={request.gri_index}")
            
            # 요청 데이터 준비
            answers_data = [
                {
                    "question_id": answer.question_id,
                    "key_alpha": answer.key_alpha,
                    "text": answer.text
                }
                for answer in request.answers
            ]
            
            payload = {
                "session_key": request.session_key,
                "gri_index": request.gri_index,
                "answers": answers_data,
                "extra_instructions": request.extra_instructions
            }
            
            # LLM 서비스 호출
            llm_result = await call_llm(payload)
            
            # LLM 서비스 응답을 로깅하여 구조 확인
            logger.info(f"LLM 서비스 응답: {llm_result}")
            
            # LLM 서비스 응답을 PolishCreate로 변환
            create_data = PolishCreate(
                session_key=request.session_key,
                gri_index=request.gri_index,
                polished_text={
                    "text": llm_result["data"]["polished_text"],
                    "model": llm_result["data"]["model"],
                    "created_at": llm_result["data"]["created_at"]
                },
                model=llm_result["data"]["model"]
            )

            # 결과 저장 및 반환 (PolishResponse가 자동으로 반환됨)
            return await self.service.create_polish(create_data)

        except Exception as e:
            logger.error(f"윤문 처리 실패: {str(e)}")
            raise

    async def get_polish_result(self, session_key: str, gri_index: str) -> PolishResponse:
        """윤문 결과 조회"""
        try:
            result = await self.service.get_polish(session_key, gri_index)
            if not result:
                raise HTTPException(status_code=404, detail="윤문 결과를 찾을 수 없습니다")
            return result
        except Exception as e:
            logger.error(f"윤문 결과 조회 실패: {str(e)}")
            raise
