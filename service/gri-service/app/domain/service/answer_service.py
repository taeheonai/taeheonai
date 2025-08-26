from app.domain.repository.answer_repository import AnswerRepository
from app.domain.schema.answer_schema import AnswerCreate, AnswerResponse

class AnswerService:
    def __init__(self, db_session):
        self.repo = AnswerRepository(db_session)

    async def create_answer(self, data: AnswerCreate) -> AnswerResponse:
        entity = self.repo.to_entity(data)
        saved = await self.repo.save(entity)
        return AnswerResponse.model_validate(saved)  # from_attributes=True 덕분

    async def get_answer_by_id(self, answer_id: int) -> Optional[AnswerResponse]:
        row = await self.repo.get(answer_id)
        return AnswerResponse.model_validate(row) if row else None

    async def get_answers_by_session(self, session_key: str, page: int, size: int) -> list[AnswerResponse]:
        skip = (page - 1) * size
        rows = await self.repo.list_by_session(session_key, skip, size)
        return [AnswerResponse.model_validate(r) for r in rows]

    async def get_all_answers(self, page: int, size: int) -> list[AnswerResponse]:
        skip = (page - 1) * size
        rows = await self.repo.list_all(skip, size)
        return [AnswerResponse.model_validate(r) for r in rows]

    async def update_answer(self, answer_id: int, data: AnswerCreate) -> Optional[AnswerResponse]:
        updated = await self.repo.update(answer_id, data)
        return AnswerResponse.model_validate(updated) if updated else None

    async def delete_answer(self, answer_id: int) -> bool:
        return await self.repo.delete(answer_id)
