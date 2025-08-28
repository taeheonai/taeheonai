from typing import Optional
from datetime import datetime
from app.domain.service.polish_service import PolishService
from app.domain.schema.polish_schema import (
    PolishRequest,
    PolishCreate,
    PolishResult,
    PolishResponse
)


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

            # TODO: LLM 서비스 호출하여 윤문 처리
            # llm_result = await llm_service.polish(request)
            # polish_data.polished_text = llm_result.polished_text
            # polish_data.sources = llm_result.sources
            # polish_data.model = llm_result.model
            # polish_data.input_tokens = llm_result.input_tokens
            # polish_data.output_tokens = llm_result.output_tokens

            # 결과 저장
            result = await self.service.create_polish(polish_data)
            return PolishResult(data=result)

        except Exception as e:
            # 에러 로깅 및 처리
            raise
