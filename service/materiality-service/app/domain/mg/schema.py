"""
MG (Materiality GRI) Schema Definitions
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

# 기존 타입들 (프론트엔드와 일치)
class GRIIndex(BaseModel):
    gri_id: int
    gri_index: str
    frequency: int
    grade: str  # 'A' | 'B' | 'C'

class MGIndexDTO(BaseModel):
    issuepool_id: int
    issue_pool: str
    ranking: str
    publish_year: str
    corporation_id: int
    category_id: int
    esg_classification_id: int
    gri_indexes: List[GRIIndex]

# 신규 타입들
class MGQuestion(BaseModel):
    id: int
    key_alpha: Optional[str] = None
    text: str
    order: int

class MGIndexBlock(BaseModel):
    gri_index: str
    item_id: int
    item_title: Optional[str] = None
    frequency: Optional[int] = None
    grade: Optional[str] = None
    questions: List[MGQuestion]

class MGIndexResponse(BaseModel):
    category_id: int
    indexes: List[MGIndexBlock]

# 요청 스키마들
class MGIndexesRequest(BaseModel):
    issuepool_ids: List[int]

class MGQuestionsRequest(BaseModel):
    category_id: int

class MGIndexQuestionsRequest(BaseModel):
    category_id: int
    gri_index: str

# 윤문 관련 스키마들
class PolishIndexPayload(BaseModel):
    session_key: str
    category_id: int
    gri_index: str
    answers_by_key: Optional[Dict[str, str]] = None
    answers_by_id: Optional[List[Dict[str, Any]]] = None
    thread_id: Optional[str] = None
    corporation_id: Optional[int] = None
    style: Optional[str] = None
    audience: Optional[str] = None
    references: Optional[List[str]] = None
    extra_meta: Optional[Dict[str, Any]] = None

class PolishedSubAnswer(BaseModel):
    question_id: int
    key_alpha: Optional[str] = None
    polished_text: str

class PolishIndexResponse(BaseModel):
    session_key: str
    gri_index: str
    item_id: int
    item_title: Optional[str] = None
    polished_index_text: Optional[str] = None
    items: List[PolishedSubAnswer]

# 응답 스키마들
class MGIndexesResponse(BaseModel):
    items: List[MGIndexDTO]

class MGPolishResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
