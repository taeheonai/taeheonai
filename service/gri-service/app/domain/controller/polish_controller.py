from typing import Optional
from datetime import datetime
import httpx
import logging
from app.domain.service.polish_service import PolishService
from app.domain.schema.polish_schema import (
    PolishRequest,
    PolishCreate,
    PolishResult,
    PolishResponse
)
from app.common.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class PolishController:
    def __init__(self):
        self.service = PolishService()

    async def polish_answers(self, request: PolishRequest) -> PolishResult:
        """GRI 답변 윤문 처리"""
        try:
            # 기존 윤문 결과 조회
            existing = await self.service.get_polish(
                session_key=request.session_key,
                gri_index=request.gri_index
            )
            
            if existing:
                return PolishResult(data=existing)

            # 새로운 윤문 요청 처리
            polish_data = PolishCreate(
                session_key=request.session_key,
                gri_index=request.gri_index,
                polished_text="",  # LLM 서비스에서 채워질 예정
                sources=[],  # LLM 서비스에서 채워질 예정
                model="gpt-4-turbo-preview",  # 기본값
                input_tokens=0,  # LLM 서비스에서 채워질 예정
                output_tokens=0,  # LLM 서비스에서 채워질 예정
                created_at=datetime.now(),
                updated_at=datetime.now()
            )

            # LLM 서비스 호출하여 윤문 처리
            logger.info(f"LLM 서비스 호출: session_key={request.session_key}, gri_index={request.gri_index}")
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"{settings.llm_service_url}/v1/polish",
                        json={
                            "session_key": request.session_key,
                            "gri_index": request.gri_index,
                            "answers": request.answers
                        }
                    )
                    response.raise_for_status()
                    llm_result = response.json()
                    
                    # 결과 매핑
                    polish_data.polished_text = llm_result.get("polished_text", "")
                    polish_data.sources = llm_result.get("sources", [])
                    polish_data.model = llm_result.get("model", "gpt-3.5-turbo")
                    polish_data.input_tokens = llm_result.get("input_tokens", 0)
                    polish_data.output_tokens = llm_result.get("output_tokens", 0)
                    
            except httpx.HTTPError as e:
                logger.error(f"LLM 서비스 호출 실패: {str(e)}")
                raise Exception(f"LLM 서비스 호출 중 오류 발생: {str(e)}")
            except Exception as e:
                logger.error(f"예상치 못한 오류: {str(e)}")
                raise

            # 결과 저장
            result = await self.service.create_polish(polish_data)
            return PolishResult(data=result)

        except Exception as e:
            # 에러 로깅 및 처리
            raise
