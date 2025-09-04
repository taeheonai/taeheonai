# app/domain/repository/mg_repository.py
from typing import List, Dict, Any, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.legacy_entity.issuepool_entity import IssuePool
# mg_entity 안에 3개 엔티티를 함께 관리
from app.domain.legacy_entity.mg_entity import (
    IssuePoolGRIEntity,  # issuepool_gri
    GriItem,             # gri_item
    GriQuestion,         # gri_question
)

class MGRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # -----------------------------
    # 0) IssuePool 기본 조회
    # -----------------------------
    async def get_issuepools_by_ids(self, issuepool_ids: List[int]) -> List[IssuePool]:
        """ID 리스트로 IssuePool 정보 조회"""
        try:
            query = (
                select(IssuePool)
                .where(IssuePool.id.in_(issuepool_ids))
                .order_by(IssuePool.ranking)
            )
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            print(f"[MG Repository] IssuePool 조회 실패: {e}")
            return []

    # -----------------------------
    # 1) 카테고리별 GRI 인덱스 조회 (그대로 유지)
    # -----------------------------
    async def get_gri_indexes_by_category(self, category_id: int) -> List[Dict[str, Any]]:
        """카테고리 ID로 GRI 인덱스 조회 (issuepool_gri 만)"""
        try:
            print(f"[MG Repository] 카테고리 {category_id}로 GRI 인덱스 조회 시작")

            query = (
                select(
                    IssuePoolGRIEntity.id.label("gri_id"),
                    IssuePoolGRIEntity.gri_index,
                    IssuePoolGRIEntity.frequency,
                    IssuePoolGRIEntity.grade,
                )
                .where(IssuePoolGRIEntity.category_id == category_id)
                .order_by(IssuePoolGRIEntity.frequency.desc(), IssuePoolGRIEntity.grade)
            )

            result = await self.db.execute(query)
            rows = result.mappings().all()
            print(f"[MG Repository] 카테고리 {category_id}에서 {len(rows)}개 GRI 인덱스 조회됨")
            return rows

        except Exception as e:
            print(f"[MG Repository] GRI 인덱스 조회 실패: {e}")
            import traceback; traceback.print_exc()
            return []

    # -----------------------------
    # 2) 여러 IssuePool → 각 GRI 인덱스 묶음 조회 (그대로 유지)
    # -----------------------------
    async def get_indexes_for_issuepools(self, issuepool_ids: List[int]) -> List[Dict[str, Any]]:
        """IssuePool별로 그룹화된 GRI 인덱스 데이터 반환"""
        try:
            print(f"[MG Repository] {len(issuepool_ids)}개 IssuePool에 대한 GRI 인덱스 조회 시작")
            issuepools = await self.get_issuepools_by_ids(issuepool_ids)

            result = []
            for issuepool in issuepools:
                gri_indexes = await self.get_gri_indexes_by_category(issuepool.category_id)
                result.append({
                    "issuepool_id": issuepool.id,
                    "issue_pool": issuepool.issue_pool,
                    "ranking": issuepool.ranking or "",  # None을 빈 문자열로 변환
                    "publish_year": issuepool.publish_year or "",  # None을 빈 문자열로 변환
                    "corporation_id": issuepool.corporation_id or 0,  # None을 0으로 변환
                    "category_id": issuepool.category_id,
                    "esg_classification_id": issuepool.esg_classification_id or 0,  # None을 0으로 변환
                    "gri_indexes": gri_indexes
                })
            print(f"[MG Repository] 총 {len(result)}개 IssuePool 그룹화 완료")
            return result

        except Exception as e:
            print(f"[MG Repository] MG Index 조회 실패: {e}")
            import traceback; traceback.print_exc()
            return []

    # -----------------------------
    # 3) [신규] 카테고리 → (GRI 인덱스, 아이템, 질문) JOIN 조회
    # -----------------------------
    async def get_questions_by_category(self, category_id: int) -> List[Dict[str, Any]]:
        """
        카테고리 ID로 해당 카테고리의 모든 GRI 인덱스에 연결된
        gri_item, gri_question을 JOIN 해서 가져옴.

        반환 컬럼:
        - gri_index, frequency, grade
        - item_id, item_title
        - question_id, key_alpha, question_text, question_order
        """
        try:
            print(f"[MG Repository] get_questions_by_category 시작: category_id={category_id}")

            stmt = (
                select(
                    IssuePoolGRIEntity.gri_index,
                    IssuePoolGRIEntity.frequency,
                    IssuePoolGRIEntity.grade,
                    GriItem.id.label("item_id"),
                    GriItem.title.label("item_title"),
                    GriQuestion.id.label("question_id"),
                    GriQuestion.key_alpha,
                    GriQuestion.question_text,
                    GriQuestion.display_order.label("question_order"),
                )
                .join(GriItem, IssuePoolGRIEntity.gri_index == GriItem.index_no)
                .join(GriQuestion, GriItem.id == GriQuestion.item_id)
                .where(IssuePoolGRIEntity.category_id == category_id)
                .order_by(GriItem.index_no, GriQuestion.display_order)
            )

            res = await self.db.execute(stmt)
            rows = res.mappings().all()
            print(f"[MG Repository] get_questions_by_category 결과: {len(rows)} rows")
            return rows

        except Exception as e:
            print(f"[MG Repository] get_questions_by_category 실패: {e}")
            import traceback; traceback.print_exc()
            return []

    # -----------------------------
    # 4) [옵션] 특정 GRI 인덱스(들)로 질문 조회
    # -----------------------------
    async def get_questions_by_gri_indexes(self, gri_indexes: List[str]) -> List[Dict[str, Any]]:
        """
        여러 gri_index 에 대해 질문을 가져와야 할 때 사용.
        """
        try            :
            print(f"[MG Repository] get_questions_by_gri_indexes: {gri_indexes}")

            stmt = (
                select(
                    GriItem.index_no.label("gri_index"),
                    GriItem.id.label("item_id"),
                    GriItem.title.label("item_title"),
                    GriQuestion.id.label("question_id"),
                    GriQuestion.key_alpha,
                    GriQuestion.question_text,
                    GriQuestion.display_order.label("question_order"),
                )
                .join(GriQuestion, GriItem.id == GriQuestion.item_id)
                .where(GriItem.index_no.in_(gri_indexes))
                .order_by(GriItem.index_no, GriQuestion.display_order)
            )

            res = await self.db.execute(stmt)
            rows = res.mappings().all()
            print(f"[MG Repository] get_questions_by_gri_indexes 결과: {len(rows)} rows")
            return rows

        except Exception as e:
            print(f"[MG Repository] get_questions_by_gri_indexes 실패: {e}")
            import traceback; traceback.print_exc()
            return []


    # 인덱스(=gri_item.index_no) 하나에 속한 질문(a,b,c..) 전부 조회
    async def get_questions_for_index(self, *, category_id: int, gri_index: str) -> List[Dict[str, Any]]:
        """
        반환 컬럼:
        - gri_index, item_id, item_title
        - question_id, key_alpha, question_text, question_order
        """
        try:
            stmt = (
                select(
                    GriItem.index_no.label("gri_index"),
                    GriItem.id.label("item_id"),
                    GriItem.title.label("item_title"),
                    GriQuestion.id.label("question_id"),
                    GriQuestion.key_alpha,
                    GriQuestion.question_text,
                    GriQuestion.display_order.label("question_order"),
                )
                .join(IssuePoolGRIEntity, IssuePoolGRIEntity.gri_index == GriItem.index_no)
                .join(GriQuestion, GriItem.id == GriQuestion.item_id)
                .where(
                    IssuePoolGRIEntity.category_id == category_id,
                    GriItem.index_no == gri_index
                )
                .order_by(GriQuestion.display_order)
            )
            res = await self.db.execute(stmt)
            return res.mappings().all()
        except Exception as e:
            print(f"[MG Repository] get_questions_for_index 실패: {e}")
            import traceback; traceback.print_exc()
            return []