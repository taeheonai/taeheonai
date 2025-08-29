# app/domain/schema/materiality_schema.py
from typing import Literal, List, Optional
from pydantic import BaseModel, ConfigDict, Field

# 🔧 ESG 범위를 1..4로 확장 (즉시 복구)
ESG = Literal[1, 2, 3, 4]  # 1:E, 2:S, 3:G, 4:?(확정 필요)

class IssuePoolDTO(BaseModel):
    id: int
    corporation_id: int
    publish_year: int
    ranking: int
    base_issue_pool: Optional[str] = None  # 원본 제목 (옵션)
    issue_pool: str
    category_id: int
    # 🔧 두 가지 방법 모두 지원
    esg_classification_id: ESG  # 방법 1: Literal
    # esg_classification_id: int = Field(ge=1, le=4)  # 방법 2: Field (주석 처리)

    # ★ Pydantic v2: ORM 직렬화 허용
    model_config = ConfigDict(from_attributes=True)

class IssuePoolListResponse(BaseModel):
    session_key: str
    thread_id: str
    issuepools: List[IssuePoolDTO]

    model_config = ConfigDict(from_attributes=True)

class IssuePoolFilter(BaseModel):
    corporation_id: Optional[int] = None
    publish_year: Optional[int] = None
    limit: int = 10
    random: bool = True

    model_config = ConfigDict(from_attributes=True)

class IssuePoolCreateRequest(BaseModel):
    """IssuePool 생성 요청 스키마"""
    corporation_id: int
    publish_year: int
    ranking: int
    issue_pool: str
    category_id: int
    esg_classification_id: int

    model_config = ConfigDict(from_attributes=True)

class IssuePoolUpdateRequest(BaseModel):
    """IssuePool 업데이트 요청 스키마"""
    corporation_id: int
    publish_year: int
    ranking: int
    issue_pool: str
    category_id: int
    esg_classification_id: int

    model_config = ConfigDict(from_attributes=True)

class IssuePoolBulkCreateRequest(BaseModel):
    """IssuePool 일괄 생성 요청 스키마"""
    items: List[IssuePoolCreateRequest]

    model_config = ConfigDict(from_attributes=True)
