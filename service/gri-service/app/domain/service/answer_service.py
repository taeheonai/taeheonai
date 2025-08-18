from typing import List, Optional
from datetime import date
import logging

from app.domain.repository.answer_repository import AnswerRepository
from app.domain.schema.answer_schema import AnswerCreate, AnswerResponse
from app.domain.entity.answer_entity import AnswerEntity

logger = logging.getLogger(__name__)

class AnswerService:
    """GRI 답변 비즈니스 로직 계층"""
    
    def __init__(self, answer_repository: AnswerRepository):
        self.answer_repository = answer_repository
    
    async def create_answer(self, answer_data: AnswerCreate) -> AnswerResponse:
        """새로운 GRI 답변을 생성합니다."""
        try:
            logger.info(f"Creating GRI answer for company: {answer_data.company_id}")
            
            # BaseModel을 Base(Entity)로 변환
            answer_entity = self.answer_repository._convert_base_model_to_base(answer_data)
            
            # 답변 생성
            created_entity = await self.answer_repository.save_entity(answer_entity)
            
            # 응답 스키마로 변환
            return AnswerResponse.model_validate(created_entity)
            
        except Exception as e:
            logger.error(f"Failed to create GRI answer: {e}")
            raise e
    
    async def get_answer_by_id(self, answer_id: int) -> Optional[AnswerResponse]:
        """ID로 GRI 답변을 조회합니다."""
        try:
            logger.info(f"Fetching GRI answer by ID: {answer_id}")
            
            answer_entity = await self.answer_repository.find_by_id(answer_id)
            
            if not answer_entity:
                logger.warning(f"GRI answer not found with ID: {answer_id}")
                return None
            
            return AnswerResponse.model_validate(answer_entity)
            
        except Exception as e:
            logger.error(f"Failed to fetch GRI answer by ID {answer_id}: {e}")
            raise e
    
    async def get_answers_by_company(self, company_id: str, page: int = 1, size: int = 10) -> list[AnswerResponse]:
        """회사별 GRI 답변 목록을 조회합니다."""
        try:
            logger.info(f"Fetching GRI answers for company: {company_id}, page: {page}, size: {size}")
            
            skip = (page - 1) * size
            
            # 답변 목록 조회
            answers = await self.answer_repository.find_by_company_id(company_id, skip, size)
            
            # 응답 스키마로 변환
            return [AnswerResponse.model_validate(answer) for answer in answers]
            
        except Exception as e:
            logger.error(f"Failed to fetch GRI answers for company {company_id}: {e}")
            raise e
    
    async def get_all_answers(self, page: int = 1, size: int = 10) -> list[AnswerResponse]:
        """모든 GRI 답변을 조회합니다."""
        try:
            logger.info(f"Fetching all GRI answers, page: {page}, size: {size}")
            
            skip = (page - 1) * size
            
            # 답변 목록 조회
            answers = await self.answer_repository.find_all(skip, size)
            
            # 응답 스키마로 변환
            return [AnswerResponse.model_validate(answer) for answer in answers]
            
        except Exception as e:
            logger.error(f"Failed to fetch all GRI answers: {e}")
            raise e
    
    async def update_answer(self, answer_id: int, answer_data: AnswerCreate) -> Optional[AnswerResponse]:
        """GRI 답변을 수정합니다."""
        try:
            logger.info(f"Updating GRI answer with ID: {answer_id}")
            
            # BaseModel의 데이터를 추출하여 업데이트용 딕셔너리 생성
            update_data = {}
            
            # None이 아닌 값만 업데이트 대상으로 포함 (date는 자동 설정되므로 제외)
            if answer_data.company_id is not None:
                update_data['company_id'] = answer_data.company_id
            if answer_data.question is not None:
                update_data['question'] = answer_data.question
            if answer_data.answer is not None:
                update_data['answer'] = answer_data.answer
            if answer_data.gri_index is not None:
                update_data['gri_index'] = answer_data.gri_index
            
            # 답변 수정
            updated_entity = await self.answer_repository.update_entity(answer_id, update_data)
            
            if not updated_entity:
                logger.warning(f"GRI answer not found with ID: {answer_id}")
                return None
            
            return AnswerResponse.model_validate(updated_entity)
            
        except Exception as e:
            logger.error(f"Failed to update GRI answer {answer_id}: {e}")
            raise e
    
    async def delete_answer(self, answer_id: int) -> bool:
        """GRI 답변을 삭제합니다."""
        try:
            logger.info(f"Deleting GRI answer with ID: {answer_id}")
            
            success = await self.answer_repository.delete_entity(answer_id)
            
            if success:
                logger.info(f"Successfully deleted GRI answer with ID: {answer_id}")
            else:
                logger.warning(f"GRI answer not found with ID: {answer_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to delete GRI answer {answer_id}: {e}")
            raise e
    
    async def get_answers_by_gri_index(self, gri_index: str, company_id: Optional[str] = None) -> List[AnswerResponse]:
        """GRI 지수로 답변을 조회합니다."""
        try:
            logger.info(f"Fetching GRI answers by index: {gri_index}, company: {company_id}")
            
            answers = await self.answer_repository.find_by_gri_index(gri_index, company_id)
            
            return [AnswerResponse.model_validate(answer) for answer in answers]
            
        except Exception as e:
            logger.error(f"Failed to fetch GRI answers by index {gri_index}: {e}")
            raise e
    

