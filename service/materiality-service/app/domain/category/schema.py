"""
Category Schema - 카테고리 관련 데이터 모델
"""
from pydantic import BaseModel
from typing import Optional, List

class CategoryRequest(BaseModel):
    """카테고리 목록 조회 요청 모델"""
    include_base_issue_pools: bool = True
    include_esg_classification: bool = True
    limit: Optional[int] = None
    offset: Optional[int] = None

class BaseIssuePool(BaseModel):
    """Base Issue Pool 모델"""
    id: int
    base_issue_pool: str
    issue_pool: str
    ranking: Optional[str] = None
    publish_year: Optional[str] = None

class ESGClassification(BaseModel):
    """ESG 분류 모델"""
    id: int
    esg: str

class Category(BaseModel):
    """카테고리 모델"""
    id: int
    category_name: str
    esg_classification: Optional[ESGClassification] = None
    base_issue_pools: Optional[List[BaseIssuePool]] = None

class CategoryResponse(BaseModel):
    """카테고리 응답 모델"""
    success: bool
    message: str
    categories: List[Category]
    total_count: int
