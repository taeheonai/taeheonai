from typing import Optional
from datetime import datetime
import httpx
import logging
from app.domain.service.polish_service import PolishService
from app.domain.schema.polish_schema import (
    PolishRequest,
    PolishCreate,
    PolishResult,
    PolishResponse,
    PolishedText
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
                model="gpt-3.5-turbo",  # 기본값
                polished_text=PolishedText(
                    text="",  # LLM 서비스에서 채워질 예정
                    model="gpt-3.5-turbo",
                    input_tokens=0,
                    output_tokens=0
                ),
                created_at=datetime.now(),
                updated_at=datetime.now()
            )

            # LLM 서비스 호출하여 윤문 처리
            logger.info(f"LLM 서비스 호출: session_key={request.session_key}, gri_index={request.gri_index}")
            try:
                # LLM 서비스 URL 확인
                llm_url = settings.llm_service_url.strip()
                if not llm_url.startswith(("http://", "https://")):
                    logger.error(f"Invalid LLM_SERVICE_URL: {repr(llm_url)}")
                    raise Exception("LLM 서비스 URL이 올바르지 않습니다")

                # API 키 확인
                llm_api_key = settings.llm_api_key
                if not llm_api_key:
                    logger.error("LLM_API_KEY not set")
                    raise Exception("LLM 서비스 API 키가 설정되지 않았습니다")

                # API 호출 헤더 설정
                headers = {
                    "x-api-key": llm_api_key,
                    "Content-Type": "application/json"
                }

                async with httpx.AsyncClient(timeout=30.0) as client:
                    # Pydantic 모델을 dict로 변환하여 전송
                    answers_data = [
                        {
                            "question_id": answer.question_id,
                            "key_alpha": answer.key_alpha,
                            "text": answer.text
                        }
                        for answer in request.answers
                    ]
                    
                    response = await client.post(
                        f"{llm_url}/v1/polish",
                        json={
                            "session_key": request.session_key,
                            "gri_index": request.gri_index,
                            "item_title": request.item_title,
                            "answers": answers_data,
                            "style": request.style,
                            "audience": request.audience,
                            "extra_instructions": request.extra_instructions
                        },
                        headers=headers
                    )
                    response.raise_for_status()
                    llm_result = response.json()
                    
                    # 결과 매핑
                    polish_data.polished_text = PolishedText(
                        text=llm_result["data"]["polished_text"],
                        model=llm_result["data"]["model"],
                        prompt_hash=llm_result["data"].get("prompt_hash"),
                        input_tokens=llm_result["data"]["input_tokens"],
                        output_tokens=llm_result["data"]["output_tokens"],
                        created_at=llm_result["data"]["created_at"]
                    )
                    polish_data.model = llm_result["data"]["model"]
                    
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
