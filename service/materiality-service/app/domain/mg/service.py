"""
MG (Materiality GRI) Service
"""
from typing import List, Optional
import logging

from app.domain.mg.repository import MGRepository
from app.domain.mg.schema import (
    MGIndexesRequest, MGIndexesResponse, MGIndexDTO,
    MGQuestionsRequest, MGIndexResponse, MGIndexBlock,
    MGIndexQuestionsRequest, PolishIndexPayload, PolishIndexResponse
)

logger = logging.getLogger(__name__)

class MGService:
    def __init__(self, repository: MGRepository):
        self.repository = repository

    async def get_mg_indexes(self, request: MGIndexesRequest) -> MGIndexesResponse:
        """MG 인덱스 조회"""
        try:
            logger.info(f"MG 인덱스 조회 서비스 시작: {len(request.issuepool_ids)}개 ID")
            
            # 리포지토리를 통해 데이터 조회
            items = await self.repository.get_mg_indexes_by_issuepool_ids(request.issuepool_ids)
            
            logger.info(f"MG 인덱스 조회 서비스 완료: {len(items)}개 항목")
            return MGIndexesResponse(items=items)
            
        except Exception as e:
            logger.error(f"MG 인덱스 조회 서비스 오류: {str(e)}")
            raise

    async def get_questions_by_category(self, request: MGQuestionsRequest) -> MGIndexResponse:
        """카테고리별 질문 조회"""
        try:
            logger.info(f"카테고리별 질문 조회 서비스 시작: category_id={request.category_id}")
            
            # 리포지토리를 통해 데이터 조회
            indexes = await self.repository.get_questions_by_category(request.category_id)
            
            logger.info(f"카테고리별 질문 조회 서비스 완료: {len(indexes)}개 블록")
            return MGIndexResponse(
                category_id=request.category_id,
                indexes=indexes
            )
            
        except Exception as e:
            logger.error(f"카테고리별 질문 조회 서비스 오류: {str(e)}")
            raise

    async def get_index_questions(self, request: MGIndexQuestionsRequest) -> MGIndexBlock:
        """특정 인덱스의 질문 조회"""
        try:
            logger.info(f"인덱스 질문 조회 서비스 시작: category_id={request.category_id}, gri_index={request.gri_index}")
            
            # 리포지토리를 통해 데이터 조회
            index_block = await self.repository.get_index_questions(request.category_id, request.gri_index)
            
            if not index_block:
                raise ValueError(f"인덱스를 찾을 수 없습니다: {request.gri_index}")
            
            logger.info(f"인덱스 질문 조회 서비스 완료: {request.gri_index}")
            return index_block
            
        except Exception as e:
            logger.error(f"인덱스 질문 조회 서비스 오류: {str(e)}")
            raise

    async def polish_index(self, payload: PolishIndexPayload) -> PolishIndexResponse:
        """인덱스 단위 윤문"""
        try:
            logger.info(f"인덱스 윤문 서비스 시작: gri_index={payload.gri_index}")
            
            # LLM 서비스 호출을 위한 데이터 준비
            import httpx
            import os
            
            # LLM 서비스 URL
            llm_service_url = os.getenv("LLM_SERVICE_URL", "https://llm-service-production-c83a.up.railway.app")
            service_api_key = os.getenv("SERVICE_API_KEY", "default-service-key")
            
            # 답변 데이터를 LLM 서비스 형식으로 변환
            answers = []
            if payload.answers_by_key:
                # key_alpha로 질문 조회하여 question_id 매핑
                index_questions = await self.repository.get_index_questions(payload.category_id, payload.gri_index)
                if index_questions and index_questions.questions:
                    for question in index_questions.questions:
                        key_alpha = question.key_alpha
                        if key_alpha and key_alpha in payload.answers_by_key:
                            answers.append({
                                "question_id": question.id,
                                "key_alpha": key_alpha,
                                "text": payload.answers_by_key[key_alpha]
                            })
            
            if not answers:
                raise ValueError("윤문할 답변이 없습니다.")
            
            # LLM 서비스에 윤문 요청
            llm_request = {
                "session_key": payload.session_key,
                "gri_index": payload.gri_index,
                "answers": answers,
                "extra_instructions": None,
                "extra_meta": payload.extra_meta
            }
            
            logger.info(f"LLM 서비스 호출: {llm_service_url}/v1/polish")
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{llm_service_url}/v1/polish",
                    json=llm_request,
                    headers={
                        "x-api-key": service_api_key,
                        "Content-Type": "application/json"
                    }
                )
                
                if response.status_code != 200:
                    logger.error(f"LLM 서비스 호출 실패: {response.status_code} - {response.text}")
                    raise Exception(f"LLM 서비스 호출 실패: {response.status_code}")
                
                llm_result = response.json()
                logger.info(f"LLM 서비스 응답 수신: {llm_result.get('status', 'unknown')}")
                
                if llm_result.get("status") != "success":
                    raise Exception(f"LLM 서비스 윤문 실패: {llm_result.get('message', 'Unknown error')}")
                
                polished_text = llm_result["data"]["polished_text"]
                model = llm_result["data"]["model"]
            
            # 윤문 결과를 PolishIndexResponse 형식으로 변환
            result = PolishIndexResponse(
                session_key=payload.session_key,
                gri_index=payload.gri_index,
                item_id=1,
                item_title=f"{payload.gri_index} 윤문 결과",
                polished_index_text=polished_text,
                items=[
                    {
                        "question_id": answer["question_id"],
                        "key_alpha": answer["key_alpha"],
                        "polished_text": polished_text  # 전체 윤문 텍스트 사용
                    }
                    for answer in answers
                ]
            )
            
            # 윤문 결과 저장
            await self.repository.save_polish_result({
                "session_key": payload.session_key,
                "gri_index": payload.gri_index,
                "polished_text": polished_text
            })
            
            logger.info(f"인덱스 윤문 서비스 완료: {payload.gri_index} (모델: {model})")
            return result
            
        except Exception as e:
            logger.error(f"인덱스 윤문 서비스 오류: {str(e)}")
            raise

    async def polish_legacy(self, session_key: str, thread_id: str, items: List[MGIndexDTO]) -> dict:
        """레거시 윤문 (기존 호환성 유지)"""
        try:
            logger.info(f"레거시 윤문 서비스 시작: {len(items)}개 항목")
            
            # 실제 윤문 로직은 LLM 서비스와 연동
            # 현재는 임시 응답 생성
            mock_response = {
                "success": True,
                "message": "윤문이 완료되었습니다.",
                "data": {
                    "session_key": session_key,
                    "thread_id": thread_id,
                    "polished_items": len(items),
                    "timestamp": "2024-01-01T00:00:00Z"
                }
            }
            
            logger.info(f"레거시 윤문 서비스 완료: {len(items)}개 항목")
            return mock_response
            
        except Exception as e:
            logger.error(f"레거시 윤문 서비스 오류: {str(e)}")
            raise
