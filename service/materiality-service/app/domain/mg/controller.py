"""
MG (Materiality GRI) Controller
"""
from typing import List
import logging

from app.domain.mg.service import MGService
from app.domain.mg.repository import MGRepository
from app.domain.mg.schema import (
    MGIndexesRequest, MGIndexesResponse,
    MGQuestionsRequest, MGIndexResponse,
    MGIndexQuestionsRequest, MGIndexBlock,
    PolishIndexPayload, PolishIndexResponse,
    MGIndexDTO
)

logger = logging.getLogger(__name__)

class MGController:
    def __init__(self, service: MGService):
        self.service = service

    async def get_mg_indexes(self, request: MGIndexesRequest) -> MGIndexesResponse:
        """MG 인덱스 조회 컨트롤러"""
        try:
            logger.info("🎯 MG 인덱스 조회 컨트롤러 시작")
            
            # 서비스를 통해 비즈니스 로직 실행
            result = await self.service.get_mg_indexes(request)
            
            logger.info(f"✅ MG 인덱스 조회 컨트롤러 완료: {len(result.items)}개 항목")
            return result
            
        except Exception as e:
            logger.error(f"❌ MG 인덱스 조회 컨트롤러 오류: {str(e)}")
            raise

    async def get_questions_by_category(self, request: MGQuestionsRequest) -> MGIndexResponse:
        """카테고리별 질문 조회 컨트롤러"""
        try:
            logger.info(f"🎯 카테고리별 질문 조회 컨트롤러 시작: category_id={request.category_id}")
            
            # 서비스를 통해 비즈니스 로직 실행
            result = await self.service.get_questions_by_category(request)
            
            logger.info(f"✅ 카테고리별 질문 조회 컨트롤러 완료: {len(result.indexes)}개 블록")
            return result
            
        except Exception as e:
            logger.error(f"❌ 카테고리별 질문 조회 컨트롤러 오류: {str(e)}")
            raise

    async def get_index_questions(self, request: MGIndexQuestionsRequest) -> MGIndexBlock:
        """특정 인덱스의 질문 조회 컨트롤러"""
        try:
            logger.info(f"🎯 인덱스 질문 조회 컨트롤러 시작: {request.gri_index}")
            
            # 서비스를 통해 비즈니스 로직 실행
            result = await self.service.get_index_questions(request)
            
            logger.info(f"✅ 인덱스 질문 조회 컨트롤러 완료: {request.gri_index}")
            return result
            
        except Exception as e:
            logger.error(f"❌ 인덱스 질문 조회 컨트롤러 오류: {str(e)}")
            raise

    async def polish_index(self, payload: PolishIndexPayload) -> PolishIndexResponse:
        """인덱스 단위 윤문 컨트롤러"""
        try:
            logger.info(f"🎯 인덱스 윤문 컨트롤러 시작: {payload.gri_index}")
            
            # 서비스를 통해 비즈니스 로직 실행
            result = await self.service.polish_index(payload)
            
            logger.info(f"✅ 인덱스 윤문 컨트롤러 완료: {payload.gri_index}")
            return result
            
        except Exception as e:
            logger.error(f"❌ 인덱스 윤문 컨트롤러 오류: {str(e)}")
            raise

    async def polish_legacy(self, session_key: str, thread_id: str, items: List[MGIndexDTO]) -> dict:
        """레거시 윤문 컨트롤러"""
        try:
            logger.info(f"🎯 레거시 윤문 컨트롤러 시작: {len(items)}개 항목")
            
            # 서비스를 통해 비즈니스 로직 실행
            result = await self.service.polish_legacy(session_key, thread_id, items)
            
            logger.info(f"✅ 레거시 윤문 컨트롤러 완료: {len(items)}개 항목")
            return result
            
        except Exception as e:
            logger.error(f"❌ 레거시 윤문 컨트롤러 오류: {str(e)}")
            raise
