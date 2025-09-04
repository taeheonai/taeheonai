# app/domain/service/mg_service.py
from typing import List, Dict, Any, Optional
import os
import httpx

from app.domain.legacy_repository.mg_repository import MGRepository
from app.domain.legacy_schema.mg_schema import (
    MGIndexDTO,                # 기존: issuepool → gri_indexes 맵
    MGPolishIndexRequest,      # 신규: 인덱스 단위 윤문 요청 DTO
    MGPolishIndexResponse,     # 신규: 인덱스 단위 윤문 응답 DTO
    MGPolishedSubAnswer,       # 신규: a,b,c 등 서브 문항 결과 DTO
    # ✅ 질문 조회용 DTO
    MGIndexResponse,
    MGIndexBlock,
    MGQuestion,
)

# 🔧 LLM Service URL/Timeout
LLM_BASE = os.getenv("LLM_SERVICE_URL", "http://llm-service:8005")  # Docker 컨테이너 이름 사용
LLM_TIMEOUT = float(os.getenv("LLM_HTTP_TIMEOUT", "60.0"))

print(f"[MG Service] LLM Service URL: {LLM_BASE}")


class MGService:
    def __init__(self, repo: MGRepository):
        self.repo = repo

    # ---------------------------------------------------------------------
    # (기존) IssuePool → GRI 인덱스 맵핑
    # ---------------------------------------------------------------------
    async def resolve_indexes(self, issuepool_ids: List[int]) -> List[MGIndexDTO]:
        rows = await self.repo.get_indexes_for_issuepools(issuepool_ids)
        return [MGIndexDTO(**row) for row in rows]

    # ---------------------------------------------------------------------
    # (기존) LLM 요청 - 레거시
    # ---------------------------------------------------------------------
    async def request_polish(self, session_key: str, thread_id: str, items: List[MGIndexDTO]):
        payload = {
            "session_key": session_key,
            "thread_id": thread_id,
            "items": [
                {
                    "issuepool_id": i.issuepool_id,
                    "category_id": i.category_id,
                    "gri_index": (i.gri_indexes[0].gri_index if i.gri_indexes else None),
                    "grade": (i.gri_indexes[0].grade if i.gri_indexes else None),
                    "frequency": (i.gri_indexes[0].frequency if i.gri_indexes else None),
                }
                for i in items
            ]
        }
        async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
            r = await client.post(f"{LLM_BASE}/v1/polish", json=payload)
            r.raise_for_status()
            return r.json()

    # ---------------------------------------------------------------------
    # (신규) 인덱스 단위(a,b,c...) 윤문
    # ---------------------------------------------------------------------
    async def polish_index(self, req: MGPolishIndexRequest) -> MGPolishIndexResponse:
        rows = await self.repo.get_questions_for_index(
            category_id=req.category_id,
            gri_index=req.gri_index
        )

        if not rows:
            return MGPolishIndexResponse(
                session_key=req.session_key,
                gri_index=req.gri_index,
                item_id=0,
                item_title=None,
                polished_index_text=None,
                items=[]
            )

        ans_by_key = req.answers_by_key or {}
        ans_by_id: Dict[int, str] = {}
        if req.answers_by_id:
            for item in req.answers_by_id:
                try:
                    qid = int(item["question_id"])
                    ans_by_id[qid] = item["raw_answer"]
                except Exception:
                    continue

        first = rows[0]
        item_id = first["item_id"]
        item_title = first.get("item_title")

        # LLM 서비스 요청용 answers 구성
        answers: List[Dict[str, Any]] = []
        for r in rows:
            qid = r["question_id"]
            alpha = r.get("key_alpha", "")
            qtext = r["question_text"]
            raw_answer = ans_by_id.get(qid, ans_by_key.get(alpha or "", ""))

            if raw_answer.strip():  # 답변이 있는 경우만 포함
                answers.append({
                    "question_id": qid,
                    "key_alpha": alpha or "",  # LLM 서비스는 null을 허용하지 않음
                    "text": raw_answer,  # 실제 답변 내용
                })

        # 답변이 없으면 빈 응답 반환
        if not answers:
            return MGPolishIndexResponse(
                session_key=req.session_key,
                gri_index=req.gri_index,
                item_id=item_id,
                item_title=item_title,
                polished_index_text="답변이 없습니다.",
                items=[]
            )

        # LLM 서비스 요청 payload
        payload = {
            "session_key": req.session_key,
            "gri_index": req.gri_index,
            "answers": answers,
            "extra_instructions": f"Style: {req.style}, Audience: {req.audience}",
            "extra_meta": req.extra_meta  # extra_meta 추가
        }

        try:
            print(f"[MG Service] Sending polish request to LLM service: {LLM_BASE}/v1/polish")
            print(f"[MG Service] Payload: {payload}")
            
            async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
                # API 키 헤더 추가
                headers = {"x-api-key": os.getenv("SERVICE_API_KEY", "default-service-key")}
                resp = await client.post(f"{LLM_BASE}/v1/polish", json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json().get("data", {})
                
            print(f"[MG Service] LLM response: {data}")
        except Exception as e:
            print(f"[MG Service] LLM request failed: {str(e)}")
            # 에러는 기록하되 빈 응답 반환
            return MGPolishIndexResponse(
                session_key=req.session_key,
                gri_index=req.gri_index,
                item_id=item_id,
                item_title=item_title,
                polished_index_text="LLM 서비스 연결 실패",
                items=[]
            )

        # LLM 서비스의 응답을 MGPolishIndexResponse 형식으로 변환
        polished_text = data.get("polished_text", "")
        
        # 각 질문별 응답을 생성
        polished_items = [
            MGPolishedSubAnswer(
                question_id=answer["question_id"],
                key_alpha=answer["key_alpha"],
                polished_text=polished_text  # 현재는 전체 텍스트를 각 항목에 동일하게 설정
            )
            for answer in answers
        ]

        return MGPolishIndexResponse(
            session_key=req.session_key,
            gri_index=req.gri_index,
            item_id=item_id,
            item_title=item_title,
            polished_index_text=polished_text,
            items=polished_items
        )

    # ---------------------------------------------------------------------
    # (신규) 질문 조회
    # ---------------------------------------------------------------------
    async def get_questions_by_category(self, category_id: int) -> MGIndexResponse:
        rows = await self.repo.get_questions_by_category(category_id)
        grouped: Dict[str, Dict[str, Any]] = {}
        for r in rows:
            idx = r["gri_index"]
            if idx not in grouped:
                grouped[idx] = {
                    "gri_index": idx,
                    "item_id": r["item_id"],
                    "item_title": r.get("item_title"),
                    "frequency": r.get("frequency"),
                    "grade": r.get("grade"),
                    "questions": []
                }
            grouped[idx]["questions"].append(
                MGQuestion(
                    id=r["question_id"],
                    key_alpha=r.get("key_alpha"),
                    text=r["question_text"],
                    order=r.get("question_order") or 0
                )
            )
        blocks: List[MGIndexBlock] = []
        for _, v in sorted(grouped.items(), key=lambda x: x[0]):
            v["questions"] = sorted(v["questions"], key=lambda q: q.order)
            blocks.append(MGIndexBlock(**v))
        return MGIndexResponse(category_id=category_id, indexes=blocks)

    async def get_questions_for_index(self, *, category_id: int, gri_index: str) -> MGIndexBlock:
        rows = await self.repo.get_questions_for_index(category_id=category_id, gri_index=gri_index)
        if not rows:
            return MGIndexBlock(
                gri_index=gri_index,
                item_id=0,
                item_title=None,
                frequency=None,
                grade=None,
                questions=[]
            )
        first = rows[0]
        return MGIndexBlock(
            gri_index=gri_index,
            item_id=first["item_id"],
            item_title=first.get("item_title"),
            frequency=first.get("frequency"),
            grade=first.get("grade"),
            questions=[
                MGQuestion(
                    id=r["question_id"],
                    key_alpha=r.get("key_alpha"),
                    text=r["question_text"],
                    order=r.get("question_order") or 0
                )
                for r in rows
            ]
        )
