from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.schema.answer_schema import AnswerCreate, AnswerResponse
from app.domain.service.answer_service import AnswerService

class AnswerController:
    """
    얇은 포워더: 서비스 호출 + 응답 래핑만 담당
    """

    # 공통 유틸: 성공 래퍼 + JSON 직렬화 보장
    def _ok(self, message: str, data: Any) -> Dict[str, Any]:
        return {
            "success": True,
            "message": message,
            "data": jsonable_encoder(data)  # ← 핵심: Pydantic/리스트/datetime 모두 안전 변환
        }

    # 서비스 인스턴스 팩토리 (중복 제거)
    def _svc(self, db: AsyncSession) -> AnswerService:
        return AnswerService(db)

    async def create_answer(self, request: AnswerCreate, db: AsyncSession) -> Dict[str, Any]:
        svc = self._svc(db)
        result = await svc.create_answer(request)  # Pydantic 모델 반환
        return self._ok("GRI 답변이 성공적으로 생성되었습니다.", result)

    async def get_answer_by_id(self, answer_id: int, db: AsyncSession) -> Dict[str, Any]:
        svc = self._svc(db)
        result = await svc.get_answer_by_id(answer_id)
        if not result:
            raise HTTPException(status_code=404, detail=f"GRI 답변 ID {answer_id}를 찾을 수 없습니다.")
        return self._ok("GRI 답변을 성공적으로 조회했습니다.", result)

    async def get_answers_by_session(self, session_key: str, page: int, size: int, db: AsyncSession) -> Dict[str, Any]:
        svc = self._svc(db)
        result = await svc.get_answers_by_session(session_key, page, size)  # list[AnswerResponse]
        return self._ok("세션별 GRI 답변 목록을 성공적으로 조회했습니다.", result)

    async def get_all_answers(self, page: int, size: int, db: AsyncSession) -> Dict[str, Any]:
        svc = self._svc(db)
        result = await svc.get_all_answers(page, size)  # list[AnswerResponse]
        return self._ok("모든 GRI 답변 목록을 성공적으로 조회했습니다.", result)

    async def update_answer(self, answer_id: int, request: AnswerCreate, db: AsyncSession) -> Dict[str, Any]:
        svc = self._svc(db)
        result = await svc.update_answer(answer_id, request)
        if not result:
            raise HTTPException(status_code=404, detail=f"GRI 답변 ID {answer_id}를 찾을 수 없습니다.")
        return self._ok("GRI 답변을 성공적으로 수정했습니다.", result)

    async def delete_answer(self, answer_id: int, db: AsyncSession) -> Dict[str, Any]:
        svc = self._svc(db)
        success = await svc.delete_answer(answer_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"GRI 답변 ID {answer_id}를 찾을 수 없습니다.")
        return self._ok("GRI 답변을 성공적으로 삭제했습니다.", {"deleted_id": answer_id})
