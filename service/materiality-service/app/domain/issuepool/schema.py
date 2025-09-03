"""
Issue Pool Schema - Pydantic BaseModel
"""
from pydantic import BaseModel, Field
from typing import Optional, List

class IssuePoolBase(BaseModel):
    """이슈풀 기본 스키마"""
    corporation_id: int
    publish_year: int
    ranking: int
    base_issue_pool: str
    issue_pool: str
    category_id: int
    esg_classification_id: int

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
    request_type: str = Field(..., description="요청 타입")
    timestamp: str = Field(..., description="타임스탬프")
    search_context: Optional[SearchContext] = Field(None, description="검색 컨텍스트")

class IssuePoolResponse(BaseModel):
    """이슈풀 응답 스키마"""
    id: int = Field(..., description="이슈풀 ID")
    corporation_id: int = Field(..., description="기업 ID")
    publish_year: int = Field(..., description="발행년도")
    ranking: int = Field(..., description="순위")
    base_issue_pool: str = Field(..., description="기본 이슈풀")
    issue_pool: str = Field(..., description="이슈풀")
    category_id: int = Field(..., description="카테고리 ID")
    esg_classification_id: int = Field(..., description="ESG 분류 ID")
    esg_classification_name: str = Field(None, description="ESG 분류명")

class IssuePoolListResponse(BaseModel):
    """이슈풀 목록 응답 스키마"""
    success: bool = Field(..., description="성공 여부")
    message: str = Field(..., description="응답 메시지")
    data: dict = Field(..., description="응답 데이터")