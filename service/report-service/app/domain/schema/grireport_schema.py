from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

# 저장된 GRI 답변 정보를 포함한 인덱스 데이터
class GRIAnswerData(BaseModel):
    standard_code: str
    question_id: str
    answer_text: str
    polished_text: Optional[str]
    display_mode: str
    is_saved: bool

# ESG 섹션별 GRI 데이터
class GRIESGSectionData(BaseModel):
    section_id: int = Field(..., description="ESG 분류 (1:E, 2:S, 3:G)")
    section_name: str = Field(..., description="Environment/Social/Governance")
    issuepool_id: int
    issue_pool: str
    answers: List[GRIAnswerData]

# GRI 보고서 구조 응답
class GRIReportStructureResponse(BaseModel):
    corporation_id: int
    corporation_name: str
    environmental: List[GRIESGSectionData]
    social: List[GRIESGSectionData]
    governance: List[GRIESGSectionData]
    last_updated: datetime

# 중복 GRI 인덱스 정보
class DuplicateGRIIndexInfo(BaseModel):
    standard_code: str
    issuepool_ids: List[int]
    current_answers: List[GRIAnswerData]

# 중복 GRI 인덱스 처리 요청
class ResolveDuplicateGRIRequest(BaseModel):
    standard_code: str
    selected_issuepool_id: int = Field(..., description="선택한 이슈풀 ID")