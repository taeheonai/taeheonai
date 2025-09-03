"""
Middleissue Schema - Pydantic BaseModel
Entity의 Base를 직접 매핑하는 스키마 및 응답용 스키마
"""
from __future__ import annotations
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

# ===== 크롤링 데이터 관련 스키마 =====
class Article(BaseModel):
    """크롤링된 기사 데이터 스키마"""
    company: str
    issue: Optional[str] = None
    original_category: Optional[str] = None
    query_kind: Optional[str] = None
    keyword: Optional[str] = None
    title: str
    description: str
    pubDate: Optional[str] = None
    originallink: Optional[str] = None

# ===== 요청/응답 기본 스키마 =====
class MiddleIssueRequest(BaseModel):
    """중간 이슈 요청 스키마"""
    company_id: str
    report_period: dict
    request_type: str = "middleissue_assessment"
    timestamp: str = datetime.now().isoformat()
    articles: List[Article] = Field(default_factory=list)
    total_results: int = 0

class MiddleIssueResponse(BaseModel):
    """중간 이슈 응답 스키마"""
    success: bool
    message: str
    data: Optional[dict] = None

# ===== Entity와 1:1 매핑되는 Base 스키마 =====
class MiddleIssueBase(BaseModel):
    """중간 이슈 기본 스키마 - issuepool 테이블과 1:1 매핑"""
    id: Optional[int] = None
    corporation_id: int
    publish_year: Optional[str] = None  # Text 타입으로 변경
    ranking: str                         # Text 타입으로 변경
    base_issue_pool: str
    issue_pool: str
    category_id: int
    esg_classification_id: int

    model_config = ConfigDict(from_attributes=True)

class CorporationBase(BaseModel):
    """기업 정보 기본 스키마 - corporation 테이블과 1:1 매핑"""
    id: Optional[int] = None
    corp_code: str
    companyname: str
    market: str
    dart_code: str

    model_config = ConfigDict(from_attributes=True)

class ESGClassificationBase(BaseModel):
    """ESG 분류 기본 스키마 - esg_classification 테이블과 1:1 매핑"""
    id: Optional[int] = None
    esg: str  # 'classification_name' → 'esg'로 변경

    model_config = ConfigDict(from_attributes=True)

class CategoryBase(BaseModel):
    """카테고리 기본 스키마 - materiality_category 테이블과 1:1 매핑"""
    id: Optional[int] = None
    category_name: str  # 'name' → 'category_name'으로 변경
    esg_classification_id: int

    model_config = ConfigDict(from_attributes=True)

class CrawledArticleBase(BaseModel):
    """크롤링된 기사 기본 스키마 - crawled_articles 테이블과 1:1 매핑"""
    id: Optional[int] = None
    company: str
    issue: str
    original_category: str
    query_kind: str
    keyword: str
    title: str
    description: Optional[str] = None
    pubDate: str
    originallink: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# ===== 리포지토리 응답용 스키마 =====
class IssueItem(BaseModel):
    """이슈 항목 응답 스키마"""
    category_id: int
    base_issue_pool: str

class CorporationIssueResponse(BaseModel):
    """기업별 이슈 응답 스키마"""
    year_issues: List[IssueItem]  # 특정 연도 이슈
    common_issues: List[IssueItem]  # publish_year가 null인 이슈

    model_config = ConfigDict(from_attributes=True)

class CategoryDetailsResponse(BaseModel):
    """카테고리 상세 정보 응답 스키마"""
    category_id: str
    normalized_category_id: int
    esg_classification_id: Optional[int] = None
    esg_classification_name: Optional[str] = None
    base_issuepools: List[BaseIssuePool]  # List[dict] → List[BaseIssuePool]로 변경
    total_count: int

# ===== 서비스 응답용 스키마 =====
class BaseIssuePool(BaseModel):
    """Base 이슈풀 상세 정보 스키마"""
    id: int
    base_issue_pool: str
    issue_pool: str
    ranking: Optional[str] = None  # Text 타입으로 변경
    esg_classification_id: Optional[int] = None
    esg_classification_name: Optional[str] = None

class MatchedCategory(BaseModel):
    """ESG 분류 및 이슈풀이 매칭된 카테고리 스키마"""
    rank: int
    category: str
    frequency_score: float
    relevance_score: float
    recent_score: float
    rank_score: float
    reference_score: float
    negative_score: float
    final_score: float
    count: int
    esg_classification: str
    esg_classification_id: Optional[int] = None
    base_issuepools: List[BaseIssuePool]
    total_issuepools: int

class MiddleIssueAssessmentResponse(BaseModel):
    """중대성 평가 응답 스키마"""
    company_id: str
    report_period: dict
    assessment_status: str
    total_articles: int
    negative_articles: int
    negative_ratio: float
    total_categories: int
    matched_categories: List[MatchedCategory]
    ranked_categories: List[dict]
    category_scores: dict
    analyzed_samples: List[dict]

# ===== 감성 분석 관련 스키마 =====
class AnalyzedArticle(BaseModel):
    """감성 분석된 기사 스키마"""
    title: str
    description: str
    sentiment: str
    sentiment_confidence: float
    neg_keywords: str
    pos_keywords: str
    sentiment_basis: str
    original_category: Optional[str] = None
    issue: Optional[str] = None
    pubDate: Optional[str] = None
    originallink: Optional[str] = None
    company: str
    relevance_label: bool = False
    recent_value: float = 0.0
    rank_label: bool = False
    reference_label: bool = False
    label_reasons: List[str] = Field(default_factory=list)

class CategoryScore(BaseModel):
    """카테고리별 점수 스키마"""
    count: int
    frequency_score: float
    relevance_score: float
    recent_score: float
    rank_score: float
    reference_score: float
    negative_score: float
    final_score: float
    articles: List[AnalyzedArticle]

class RankedCategory(BaseModel):
    """순위가 매겨진 카테고리 스키마"""
    rank: int
    category: str
    count: int
    frequency_score: float
    relevance_score: float
    recent_score: float
    rank_score: float
    reference_score: float
    negative_score: float
    final_score: float