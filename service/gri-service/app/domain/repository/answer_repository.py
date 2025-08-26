from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List, Optional
from datetime import date

from app.domain.entity.answer_entity import AnswerEntity
from app.domain.schema.answer_schema import AnswerCreate

class AnswerRepository:
    """GRI 답변 데이터 접근 계층 - BaseModel을 Base로 변환하는 역할만 담당"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    def _convert_base_model_to_base(self, answer_data: AnswerCreate) -> AnswerEntity:
        """BaseModel을 Base(Entity)로 변환합니다."""
        try:
            # BaseModel의 데이터를 추출하여 Base(Entity) 생성
            answer_entity = AnswerEntity(
                question_id=answer_data.question_id,
                session_key=answer_data.session_key,
                answer_text=answer_data.answer_text,
                answer_json=answer_data.answer_json,
                is_completed=answer_data.is_completed
            )
            return answer_entity
            
        except Exception as e:
            raise Exception(f"BaseModel을 Base로 변환 중 오류 발생: {str(e)}")
    
    async def save_entity(self, entity: AnswerEntity) -> AnswerEntity:
        """엔티티를 데이터베이스에 저장합니다."""
        try:
            self.db.add(entity)
            await self.db.commit()
            await self.db.refresh(entity)
            return entity
        except Exception as e:
            await self.db.rollback()
            raise e
    
    async def find_by_id(self, answer_id: int) -> Optional[AnswerEntity]:
        """ID로 엔티티를 조회합니다."""
        try:
            result = await self.db.execute(
                select(AnswerEntity).where(AnswerEntity.id == answer_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            raise e
    
    async def find_by_session_key(self, session_key: str, skip: int = 0, limit: int = 100) -> List[AnswerEntity]:
        """세션 키로 엔티티 목록을 조회합니다."""
        try:
            result = await self.db.execute(
                select(AnswerEntity)
                .where(AnswerEntity.session_key == session_key)
                .offset(skip)
                .limit(limit)
                .order_by(AnswerEntity.created_at.desc())
            )
            return result.scalars().all()
        except Exception as e:
            raise e
    
    async def find_all(self, skip: int = 0, limit: int = 100) -> List[AnswerEntity]:
        """모든 엔티티를 조회합니다."""
        try:
            result = await self.db.execute(
                select(AnswerEntity)
                .offset(skip)
                .limit(limit)
                .order_by(AnswerEntity.created_at.desc())
            )
            return result.scalars().all()
        except Exception as e:
            raise e
    
    async def update_entity(self, answer_id: int, update_data: dict) -> Optional[AnswerEntity]:
        """엔티티를 업데이트합니다."""
        try:
            if not update_data:
                return await self.find_by_id(answer_id)
            
            await self.db.execute(
                update(AnswerEntity)
                .where(AnswerEntity.id == answer_id)
                .values(**update_data)
            )
            
            await self.db.commit()
            return await self.find_by_id(answer_id)
        except Exception as e:
            await self.db.rollback()
            raise e
    
    async def delete_entity(self, answer_id: int) -> bool:
        """엔티티를 삭제합니다."""
        try:
            result = await self.db.execute(
                delete(AnswerEntity).where(AnswerEntity.id == answer_id)
            )
            await self.db.commit()
            return result.rowcount > 0
        except Exception as e:
            await self.db.rollback()
            raise e
    
    async def find_by_question_id(self, question_id: int, session_key: Optional[str] = None) -> List[AnswerEntity]:
        """질문 ID로 엔티티를 조회합니다."""
        try:
            query = select(AnswerEntity).where(AnswerEntity.question_id == question_id)
            
            if session_key:
                query = query.where(AnswerEntity.session_key == session_key)
            
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            raise e
