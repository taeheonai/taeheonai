# app/domain/schema/mg_schema.py
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict

Grade = Literal['A','B','C']

class MGIndexDTO(BaseModel):
    issuepool_id: int           # ← id 대신 issuepool_id
    category_id: int
    gri_index: str
    frequency: int
    grade: Grade
    gri_id: Optional[int] = None  # ← 필요하면 GRI 행의 id도 보냄
    model_config = ConfigDict(from_attributes=True)

class MGResolveRequest(BaseModel):
    issuepool_ids: List[int]  # materiality에서 선택한 10개 id

class MGIndexMapResponse(BaseModel):
    items: List[MGIndexDTO]
