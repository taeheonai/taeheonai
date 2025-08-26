from fastapi.encoders import jsonable_encoder
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from app.domain.entity.answer_entity import AnswerEntity
from app.domain.schema.answer_schema import AnswerCreate

class AnswerRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    def to_entity(self, data: AnswerCreate) -> AnswerEntity:
        return AnswerEntity(
            question_id=data.question_id,
            session_key=data.session_key,
            answer_text=data.answer_text,
            answer_json=jsonable_encoder(data.answer_json),  # 안전 변환
            is_completed=data.is_completed
        )

    async def save(self, entity: AnswerEntity) -> AnswerEntity:
        self.db.add(entity)
        await self.db.commit()
        await self.db.refresh(entity)
        return entity

    async def get(self, answer_id: int) -> Optional[AnswerEntity]:
        return await self.db.get(AnswerEntity, answer_id)

    async def list_by_session(self, session_key: str, skip: int, limit: int) -> List[AnswerEntity]:
        q = (
            select(AnswerEntity)
            .where(AnswerEntity.session_key == session_key)
            .order_by(AnswerEntity.created_at.desc())
            .offset(skip).limit(limit)
        )
        rows = await self.db.execute(q)
        return rows.scalars().all()

    async def list_all(self, skip: int, limit: int) -> List[AnswerEntity]:
        q = select(AnswerEntity).order_by(AnswerEntity.created_at.desc()).offset(skip).limit(limit)
        rows = await self.db.execute(q)
        return rows.scalars().all()

    async def update(self, answer_id: int, data: AnswerCreate) -> Optional[AnswerEntity]:
        payload = {
            "answer_text": data.answer_text,
            "answer_json": jsonable_encoder(data.answer_json),
            "is_completed": True
        }
        await self.db.execute(
            update(AnswerEntity).where(AnswerEntity.id == answer_id).values(**payload)
        )
        await self.db.commit()
        return await self.get(answer_id)

    async def delete(self, answer_id: int) -> bool:
        res = await self.db.execute(delete(AnswerEntity).where(AnswerEntity.id == answer_id))
        await self.db.commit()
        return res.rowcount > 0
