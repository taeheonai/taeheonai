# app/domain/schema/materiality_schema.py
from typing import Literal, List, Optional
from pydantic import BaseModel, ConfigDict, Field

# 🔧 ESG 범위를 1..4로 확장 (즉시 복구)
ESG = Literal[1, 2, 3, 4]  # 1:E, 2:S, 3:G, 4:?(확정 필요)

class IssuePoolDTO(BaseModel):
    id: int
    corporation_id: Optional[int] = None  # 🔧 NULL 허용
    publish_year: Optional[str] = None    # 🔧 NULL 허용
    ranking: Optional[str] = None         # 🔧 NULL 허용
    base_issue_pool: Optional[str] = None  # 원본 제목 (옵션)
    issue_pool: str
    category_id: int
    # 🔧 두 가지 방법 모두 지원
    esg_classification_id: ESG  # 방법 1: Literal
    # esg_classification_id: int = Field(ge=1, le=4)  # 방법 2: Field (주석 처리)

    # ★ Pydantic v2: ORM 직렬화 허용
    model_config = ConfigDict(
        from_attributes=True,
        # 🔧 더 유연한 타입 변환 허용
        coerce_types_to_python=True,
        # 🔧 문자열을 숫자로 자동 변환 (예: '0' → 0)
        strict=False
    )

class IssuePoolListResponse(BaseModel):
    session_key: str
    thread_id: str
    issuepools: List[IssuePoolDTO]

    model_config = ConfigDict(
        from_attributes=True,
        coerce_types_to_python=True,
        strict=False
    )

class IssuePoolFilter(BaseModel):
    corporation_id: Optional[int] = None
    publish_year: Optional[str] = None
    limit: int = 10
    random: bool = True

    model_config = ConfigDict(
        from_attributes=True,
        coerce_types_to_python=True,
        strict=False
    )

class IssuePoolCreateRequest(BaseModel):
    """IssuePool 생성 요청 스키마"""
    corporation_id: int
    publish_year: str
    ranking: str
    issue_pool: str
    category_id: int
    esg_classification_id: int

    model_config = ConfigDict(
        from_attributes=True,
        coerce_types_to_python=True,
        strict=False
    )

class IssuePoolUpdateRequest(BaseModel):
    """IssuePool 업데이트 요청 스키마"""
    corporation_id: Optional[int] = None
    publish_year: Optional[str] = None
    ranking: Optional[str] = None
    issue_pool: Optional[str] = None
    category_id: Optional[int] = None
    esg_classification_id: Optional[int] = None

    model_config = ConfigDict(
        from_attributes=True,
        coerce_types_to_python=True,
        strict=False
    )

class IssuePoolBulkCreateRequest(BaseModel):
    """IssuePool 일괄 생성 요청 스키마"""
    items: List[IssuePoolCreateRequest]

    model_config = ConfigDict(
        from_attributes=True,
        coerce_types_to_python=True,
        strict=False
    )
