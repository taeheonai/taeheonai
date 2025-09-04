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
    items: List[IssuePoolDTO]
    total_count: int
    timestamp: str

class IssuePoolCreateRequest(BaseModel):
    """axios로부터 받은 JSON 데이터로 IssuePool 생성"""
    corporation_id: Optional[int] = None
    publish_year: Optional[str] = None
    ranking: Optional[str] = None
    base_issue_pool: Optional[str] = None
    issue_pool: str
    category_id: int
    esg_classification_id: ESG

class IssuePoolUpdateRequest(BaseModel):
    """axios로부터 받은 JSON 데이터로 IssuePool 업데이트"""
    corporation_id: Optional[int] = None
    publish_year: Optional[str] = None
    ranking: Optional[str] = None
    base_issue_pool: Optional[str] = None
    issue_pool: Optional[str] = None
    category_id: Optional[int] = None
    esg_classification_id: Optional[ESG] = None

class IssuePoolFilter(BaseModel):
    """필터 조건에 따른 IssuePool 목록 조회"""
    corporation_id: Optional[int] = None
    publish_year: Optional[str] = None
    category_id: Optional[int] = None
    esg_classification_id: Optional[ESG] = None
    limit: Optional[int] = Field(100, ge=1, le=1000)
    offset: Optional[int] = Field(0, ge=0)

class IssuePoolBulkCreateRequest(BaseModel):
    """axios로부터 받은 JSON 데이터 리스트로 IssuePool 일괄 생성"""
    items: List[IssuePoolCreateRequest]

# 기존 스키마들도 유지
class ReportPeriod(BaseModel):
    """보고기간 스키마"""
    start_date: str = Field(..., description="시작일 (YYYY-MM-DD)")
    end_date: str = Field(..., description="종료일 (YYYY-MM-DD)")

class SearchContext(BaseModel):
    """검색 컨텍스트 스키마"""
    total_articles: Optional[int] = Field(None, description="총 기사 수")
    search_period: Optional[ReportPeriod] = Field(None, description="검색 기간")
    company_id: Optional[str] = Field(None, description="기업 ID")

class IssuePoolListRequest(BaseModel):
    """이슈풀 목록 조회 요청 스키마"""
    company_id: str = Field(..., description="기업명")
    report_period: ReportPeriod = Field(..., description="보고기간")
    search_context: Optional[SearchContext] = Field(None, description="검색 컨텍스트")