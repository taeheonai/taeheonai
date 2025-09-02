from typing import List, Optional
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.domain.entity.grireport_entity import GRIReport
from app.domain.schema.grireport_schema import (
    GRIESGSectionData,
    GRIAnswerData,
    DuplicateGRIIndexInfo
)

class GRIReportRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_esg_section_data(
        self,
        corporation_id: int,
        esg_classification_id: int
    ) -> List[GRIESGSectionData]:
        """ESG 분류별 GRI 데이터 조회"""
        query = select(GRIReport).where(
            and_(
                GRIReport.corporation_id == corporation_id,
                GRIReport.esg_classification_id == esg_classification_id,
                GRIReport.is_saved == True  # 저장된 답변만 조회
            )
        ).order_by(GRIReport.issuepool_id, GRIReport.standard_code, GRIReport.question_id)

        result = await self._session.execute(query)
        reports = result.scalars().all()

        # issuepool_id로 그룹화
        grouped_data = {}
        for report in reports:
            if report.issuepool_id not in grouped_data:
                grouped_data[report.issuepool_id] = {
                    'issuepool_id': report.issuepool_id,
                    'issue_pool': '',  # TODO: issuepool 정보 조회 필요
                    'answers': []
                }
            
            grouped_data[report.issuepool_id]['answers'].append(
                GRIAnswerData(
                    standard_code=report.standard_code,
                    question_id=report.question_id,
                    answer_text=report.answer_text,
                    polished_text=report.polished_text,
                    display_mode=report.display_mode,
                    is_saved=report.is_saved
                )
            )

        return [
            GRIESGSectionData(
                section_id=esg_classification_id,
                section_name=self._get_section_name(esg_classification_id),
                **data
            )
            for data in grouped_data.values()
        ]

    async def find_duplicate_indexes(
        self,
        corporation_id: int
    ) -> List[DuplicateGRIIndexInfo]:
        """중복된 GRI 인덱스 찾기"""
        # 동일한 standard_code를 가진 여러 issuepool의 답변 찾기
        query = select(GRIReport).where(
            and_(
                GRIReport.corporation_id == corporation_id,
                GRIReport.is_saved == True
            )
        ).order_by(GRIReport.standard_code, GRIReport.issuepool_id)

        result = await self._session.execute(query)
        reports = result.scalars().all()

        # standard_code로 그룹화하여 중복 체크
        duplicates = {}
        for report in reports:
            if report.standard_code not in duplicates:
                duplicates[report.standard_code] = {
                    'issuepool_ids': set(),
                    'answers': []
                }
            
            duplicates[report.standard_code]['issuepool_ids'].add(report.issuepool_id)
            duplicates[report.standard_code]['answers'].append(
                GRIAnswerData(
                    standard_code=report.standard_code,
                    question_id=report.question_id,
                    answer_text=report.answer_text,
                    polished_text=report.polished_text,
                    display_mode=report.display_mode,
                    is_saved=report.is_saved
                )
            )

        # 중복된 것만 필터링
        return [
            DuplicateGRIIndexInfo(
                standard_code=code,
                issuepool_ids=list(data['issuepool_ids']),
                current_answers=data['answers']
            )
            for code, data in duplicates.items()
            if len(data['issuepool_ids']) > 1
        ]

    async def resolve_duplicate(
        self,
        corporation_id: int,
        standard_code: str,
        selected_issuepool_id: int
    ) -> bool:
        """중복 GRI 인덱스 해결 - 선택된 이슈풀의 답변만 남기고 나머지 삭제"""
        # 선택되지 않은 답변 삭제
        delete_query = select(GRIReport).where(
            and_(
                GRIReport.corporation_id == corporation_id,
                GRIReport.standard_code == standard_code,
                GRIReport.issuepool_id != selected_issuepool_id
            )
        )
        result = await self._session.execute(delete_query)
        deleted = result.scalars().all()
        
        for report in deleted:
            await self._session.delete(report)
        
        await self._session.commit()
        return True

    def _get_section_name(self, esg_classification_id: int) -> str:
        """ESG 분류 ID를 이름으로 변환"""
        return {
            1: "Environmental",
            2: "Social",
            3: "Governance"
        }.get(esg_classification_id, "Unknown")

    async def save_answers(
        self,
        corporation_id: int,
        answers: dict
    ) -> bool:
        """GRI 답변 저장"""
        try:
            # 기존 답변 삭제
            delete_query = select(GRIReport).where(
                GRIReport.corporation_id == corporation_id
            )
            result = await self._session.execute(delete_query)
            existing_reports = result.scalars().all()
            for report in existing_reports:
                await self._session.delete(report)

            # 새로운 답변 저장
            for index_id, questions in answers.items():
                for question_id, answer_data in questions.items():
                    new_report = GRIReport(
                        corporation_id=corporation_id,
                        standard_code=index_id,
                        question_id=question_id,
                        answer_text=answer_data.get('answer_text', ''),
                        polished_text=answer_data.get('polished_text'),
                        display_mode=answer_data.get('display_mode', 'table'),
                        is_saved=True
                    )
                    self._session.add(new_report)

            await self._session.commit()
            return True
        except Exception as e:
            await self._session.rollback()
            raise e

    async def get_answers(
        self,
        corporation_id: int
    ) -> dict:
        """저장된 GRI 답변 조회"""
        query = select(GRIReport).where(
            and_(
                GRIReport.corporation_id == corporation_id,
                GRIReport.is_saved == True
            )
        )
        result = await self._session.execute(query)
        reports = result.scalars().all()

        # 답변을 인덱스별로 그룹화
        answers = {}
        for report in reports:
            if report.standard_code not in answers:
                answers[report.standard_code] = {}
            
            answers[report.standard_code][report.question_id] = {
                'answer_text': report.answer_text,
                'polished_text': report.polished_text,
                'display_mode': report.display_mode,
                'is_saved': report.is_saved
            }

        return answers