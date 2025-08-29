# app/domain/schema/mg_schema.py
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

Grade = Literal['A','B','C']

class GRIIndex(BaseModel):
    """개별 GRI 인덱스 정보"""
    gri_id: int
    gri_index: str
    frequency: int
    grade: Grade
    model_config = ConfigDict(from_attributes=True)

class MGIndexDTO(BaseModel):
    """IssuePool별로 그룹화된 GRI 인덱스 데이터"""
    issuepool_id: int
    issue_pool: str
    ranking: str
    publish_year: str
    corporation_id: int
    category_id: int
    esg_classification_id: int
    gri_indexes: List[GRIIndex]
    model_config = ConfigDict(from_attributes=True)

class MGResolveRequest(BaseModel):
    issuepool_ids: List[int] = Field(..., alias="issuepool_ids")
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

class MGIndexMapResponse(BaseModel):
    items: List[MGIndexDTO]
