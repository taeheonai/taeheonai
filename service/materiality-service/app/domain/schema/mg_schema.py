# app/domain/schema/mg_schema.py
from typing import List, Literal
from pydantic import BaseModel, ConfigDict

Grade = Literal['A','B','C']

class MGIndexDTO(BaseModel):
    issuepool_id: int
    category_id: int
    gri_index: str
    frequency: int
    grade: Grade
    model_config = ConfigDict(from_attributes=True)

class MGResolveRequest(BaseModel):
    issuepool_ids: List[int]  # materiality에서 선택한 10개 id

class MGIndexMapResponse(BaseModel):
    items: List[MGIndexDTO]
