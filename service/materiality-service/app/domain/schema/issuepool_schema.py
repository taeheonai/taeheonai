# app/domain/schema/materiality_schema.py
from typing import Literal, List, Optional
from pydantic import BaseModel

ESG = Literal[1, 2, 3]  # 1:E, 2:S, 3:G

class IssuePoolDTO(BaseModel):
    id: int
    corporation_id: int
    publish_year: int
    ranking: int
    issue_pool: str
    category_id: int
    esg_classification_id: ESG

class IssuePoolListResponse(BaseModel):
    session_key: str
    thread_id: str
    items: List[IssuePoolDTO]

class IssuePoolFilter(BaseModel):
    corporation_id: Optional[int] = None
    publish_year: Optional[int] = None
    limit: int = 10
    random: bool = True

    # ... existing code ...

class IssuePoolCreateRequest(BaseModel):
    """IssuePool 생성 요청 스키마"""
    corporation_id: int
    publish_year: int
    ranking: int
    issue_pool: str
    category_id: int
    esg_classification_id: int

class IssuePoolUpdateRequest(BaseModel):
    """IssuePool 업데이트 요청 스키마"""
    corporation_id: int
    publish_year: int
    ranking: int
    issue_pool: str
    category_id: int
    esg_classification_id: int

class IssuePoolBulkCreateRequest(BaseModel):
    """IssuePool 일괄 생성 요청 스키마"""
    issuepools: List[IssuePoolCreateRequest]
