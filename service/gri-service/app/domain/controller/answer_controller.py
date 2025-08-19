from fastapi import HTTPException
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.schema.answer_schema import AnswerCreate, AnswerResponse
from app.domain.service.answer_service import AnswerService

class AnswerController:
    """
    교차 NTT 역할: 요청을 받아서 적절한 서비스로 전달만 담당
    """
    
    def __init__(self):
        pass

    async def create_answer(self, request: AnswerCreate, db: AsyncSession) -> Dict[str, Any]:
        """
        GRI 답변 생성 요청을 AnswerService로 전달 (교차 NTT 역할)
        """
        try:
            # 단순 전달: AnswerService 인스턴스 생성 및 요청 전달
            answer_service = AnswerService(db)
            result = await answer_service.create_answer(request)
            return {
                "success": True,
                "message": "GRI 답변이 성공적으로 생성되었습니다.",
                "data": result
            }
            
        except Exception as e:
            # 교차 NTT는 단순 전달만, 에러는 상위에서 처리
            raise

    async def get_answer_by_id(self, answer_id: int, db: AsyncSession) -> Dict[str, Any]:
        """
        GRI 답변 조회 요청을 AnswerService로 전달 (교차 NTT 역할)
        """
        try:
            # 단순 전달: AnswerService 인스턴스 생성 및 요청 전달
            answer_service = AnswerService(db)
            result = await answer_service.get_answer_by_id(answer_id)
            
            if not result:
                raise HTTPException(status_code=404, detail=f"GRI 답변 ID {answer_id}를 찾을 수 없습니다.")
            
            return {
                "success": True,
                "message": "GRI 답변을 성공적으로 조회했습니다.",
                "data": result
            }
            
        except HTTPException:
            raise
        except Exception as e:
            # 교차 NTT는 단순 전달만, 에러는 상위에서 처리
            raise

    async def get_answers_by_session(self, session_key: str, page: int, size: int, db: AsyncSession) -> Dict[str, Any]:
        """
        세션별 GRI 답변 목록 조회 요청을 AnswerService로 전달 (교차 NTT 역할)
        """
        try:
            # 단순 전달: AnswerService 인스턴스 생성 및 요청 전달
            answer_service = AnswerService(db)
            result = await answer_service.get_answers_by_session(session_key, page, size)
            
            return {
                "success": True,
                "message": "세션별 GRI 답변 목록을 성공적으로 조회했습니다.",
                "data": result
            }
            
        except Exception as e:
            # 교차 NTT는 단순 전달만, 에러는 상위에서 처리
            raise

    async def get_all_answers(self, page: int, size: int, db: AsyncSession) -> Dict[str, Any]:
        """
        모든 GRI 답변 목록 조회 요청을 AnswerService로 전달 (교차 NTT 역할)
        """
        try:
            # 단순 전달: AnswerService 인스턴스 생성 및 요청 전달
            answer_service = AnswerService(db)
            result = await answer_service.get_all_answers(page, size)
            
            return {
                "success": True,
                "message": "모든 GRI 답변 목록을 성공적으로 조회했습니다.",
                "data": result
            }
            
        except Exception as e:
            # 교차 NTT는 단순 전달만, 에러는 상위에서 처리
            raise

    async def update_answer(self, answer_id: int, request: AnswerCreate, db: AsyncSession) -> Dict[str, Any]:
        """
        GRI 답변 수정 요청을 AnswerService로 전달 (교차 NTT 역할)
        """
        try:
            # 단순 전달: AnswerService 인스턴스 생성 및 요청 전달
            answer_service = AnswerService(db)
            result = await answer_service.update_answer(answer_id, request)
            
            if not result:
                raise HTTPException(status_code=404, detail=f"GRI 답변 ID {answer_id}를 찾을 수 없습니다.")
            
            return {
                "success": True,
                "message": "GRI 답변을 성공적으로 수정했습니다.",
                "data": result
            }
            
        except HTTPException:
            raise
        except Exception as e:
            # 교차 NTT는 단순 전달만, 에러는 상위에서 처리
            raise

    async def delete_answer(self, answer_id: int, db: AsyncSession) -> Dict[str, Any]:
        """
        GRI 답변 삭제 요청을 AnswerService로 전달 (교차 NTT 역할)
        """
        try:
            # 단순 전달: AnswerService 인스턴스 생성 및 요청 전달
            answer_service = AnswerService(db)
            success = await answer_service.delete_answer(answer_id)
            
            if not success:
                raise HTTPException(status_code=404, detail=f"GRI 답변 ID {answer_id}를 찾을 수 없습니다.")
            
            return {
                "success": True,
                "message": "GRI 답변을 성공적으로 삭제했습니다.",
                "data": {"deleted_id": answer_id}
            }
            
        except HTTPException:
            raise
        except Exception as e:
            # 교차 NTT는 단순 전달만, 에러는 상위에서 처리
            raise