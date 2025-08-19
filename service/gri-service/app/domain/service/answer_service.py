from typing import List, Optional
from datetime import date
import logging

from app.domain.repository.answer_repository import AnswerRepository
from app.domain.schema.answer_schema import AnswerCreate, AnswerResponse
from app.domain.entity.answer_entity import AnswerEntity

logger = logging.getLogger(__name__)

class AnswerService:
    """GRI 답변 비즈니스 로직 계층"""
    
    def __init__(self, db_session):
        self.db_session = db_session
    
    async def create_answer(self, answer_data: AnswerCreate) -> AnswerResponse:
        """새로운 GRI 답변을 생성합니다."""
        try:
            logger.info(f"Creating GRI answer for question: {answer_data.question_id}")
            
            # 새로운 답변 엔티티 생성
            answer_entity = AnswerEntity(
                question_id=answer_data.question_id,
                session_key=answer_data.session_key,
                answer_text=answer_data.answer_text,
                answer_json=answer_data.answer_json,
                is_completed=True
            )
            
            # 데이터베이스에 저장
            self.db_session.add(answer_entity)
            await self.db_session.commit()
            await self.db_session.refresh(answer_entity)
            
            # 응답 스키마로 변환
            return AnswerResponse(
                id=answer_entity.id,
                question_id=answer_entity.question_id,
                session_key=answer_entity.session_key,
                answer_text=answer_entity.answer_text,
                answer_json=answer_entity.answer_json,
                is_completed=answer_entity.is_completed,
                created_at=answer_entity.created_at.isoformat(),
                updated_at=answer_entity.updated_at.isoformat()
            )
            
        except Exception as e:
            logger.error(f"Failed to create GRI answer: {e}")
            raise e
    
    async def get_answer_by_id(self, answer_id: int) -> Optional[AnswerResponse]:
        """ID로 GRI 답변을 조회합니다."""
        try:
            logger.info(f"Fetching GRI answer by ID: {answer_id}")
            
            result = await self.db_session.execute(
                "SELECT * FROM gri_answer WHERE id = $1",
                answer_id
            )
            answer_data = result.fetchone()
            
            if not answer_data:
                logger.warning(f"GRI answer not found with ID: {answer_id}")
                return None
            
            # 응답 스키마로 변환
            return AnswerResponse(
                id=answer_data.id,
                question_id=answer_data.question_id,
                session_key=answer_data.session_key,
                answer_text=answer_data.answer_text,
                answer_json=answer_data.answer_json,
                is_completed=answer_data.is_completed,
                created_at=answer_data.created_at.isoformat(),
                updated_at=answer_data.updated_at.isoformat()
            )
            
        except Exception as e:
            logger.error(f"Failed to fetch GRI answer by ID {answer_id}: {e}")
            raise e
    
    async def get_answers_by_session(self, session_key: str, page: int = 1, size: int = 10) -> list[AnswerResponse]:
        """세션별 GRI 답변 목록을 조회합니다."""
        try:
            logger.info(f"Fetching GRI answers for session: {session_key}, page: {page}, size: {size}")
            
            skip = (page - 1) * size
            
            # 답변 목록 조회
            result = await self.db_session.execute(
                "SELECT * FROM gri_answer WHERE session_key = $1 ORDER BY created_at LIMIT $2 OFFSET $3",
                session_key, size, skip
            )
            answers = result.fetchall()
            
            # 응답 스키마로 변환
            return [AnswerResponse(
                id=answer.id,
                question_id=answer.question_id,
                session_key=answer.session_key,
                answer_text=answer.answer_text,
                answer_json=answer.answer_json,
                is_completed=answer.is_completed,
                created_at=answer.created_at.isoformat(),
                updated_at=answer.updated_at.isoformat()
            ) for answer in answers]
            
        except Exception as e:
            logger.error(f"Failed to fetch GRI answers for session {session_key}: {e}")
            raise e
    
    async def get_all_answers(self, page: int = 1, size: int = 10) -> list[AnswerResponse]:
        """모든 GRI 답변을 조회합니다."""
        try:
            logger.info(f"Fetching all GRI answers, page: {page}, size: {size}")
            
            skip = (page - 1) * size
            
            # 답변 목록 조회
            result = await self.db_session.execute(
                "SELECT * FROM gri_answer ORDER BY created_at LIMIT $1 OFFSET $2",
                size, skip
            )
            answers = result.fetchall()
            
            # 응답 스키마로 변환
            return [AnswerResponse(
                id=answer.id,
                question_id=answer.question_id,
                session_key=answer.session_key,
                answer_text=answer.answer_text,
                answer_json=answer.answer_json,
                is_completed=answer.is_completed,
                created_at=answer.created_at.isoformat(),
                updated_at=answer.updated_at.isoformat()
            ) for answer in answers]
            
        except Exception as e:
            logger.error(f"Failed to fetch all GRI answers: {e}")
            raise e
    
    async def update_answer(self, answer_id: int, answer_data: AnswerCreate) -> Optional[AnswerResponse]:
        """GRI 답변을 수정합니다."""
        try:
            logger.info(f"Updating GRI answer with ID: {answer_id}")
            
            # 기존 답변 조회
            result = await self.db_session.execute(
                "SELECT * FROM gri_answer WHERE id = $1",
                answer_id
            )
            existing_answer = result.fetchone()
            
            if not existing_answer:
                logger.warning(f"GRI answer not found with ID: {answer_id}")
                return None
            
            # 답변 업데이트
            await self.db_session.execute(
                """
                UPDATE gri_answer 
                SET answer_text = $1, answer_json = $2, is_completed = TRUE, updated_at = NOW()
                WHERE id = $3
                """,
                answer_data.answer_text, answer_data.answer_json, answer_id
            )
            await self.db_session.commit()
            
            # 업데이트된 답변 조회
            return await self.get_answer_by_id(answer_id)
            
        except Exception as e:
            logger.error(f"Failed to update GRI answer {answer_id}: {e}")
            raise e
    
    async def delete_answer(self, answer_id: int) -> bool:
        """GRI 답변을 삭제합니다."""
        try:
            logger.info(f"Deleting GRI answer with ID: {answer_id}")
            
            result = await self.db_session.execute(
                "DELETE FROM gri_answer WHERE id = $1",
                answer_id
            )
            await self.db_session.commit()
            
            return result.rowcount > 0
            
        except Exception as e:
            logger.error(f"Failed to delete GRI answer {answer_id}: {e}")
            raise e
    
    async def get_answers_by_gri_index(self, gri_index: str, company_id: Optional[str] = None) -> List[AnswerResponse]:
        """GRI 지수로 답변을 조회합니다."""
        try:
            logger.info(f"Fetching GRI answers by index: {gri_index}, company: {company_id}")
            
            answers = await self.answer_repository.find_by_gri_index(gri_index, company_id)
            
            # 응답 스키마로 변환 (이미 문자열이므로 직접 매핑)
            return [AnswerResponse.model_validate(answer) for answer in answers]
            
        except Exception as e:
            logger.error(f"Failed to fetch GRI answers by index {gri_index}: {e}")
            raise e
    

