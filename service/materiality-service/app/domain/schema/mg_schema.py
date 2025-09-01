# app/domain/schema/mg_schema.py
from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

# ===== 공통 타입 =====
Grade = Literal['A', 'B', 'C']

# ===== 기존: 인덱스 맵 응답 =====
class GRIIndex(BaseModel):
    """개별 GRI 인덱스 정보 (issuepool_gri 전용 요약)"""
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


# ===== 신규: 카테고리 → (인덱스→아이템→질문) 응답 =====
class MGQuestion(BaseModel):
    """gri_question 단위"""
    id: int
    key_alpha: Optional[str] = None
    text: str
    order: int = 0
    # 필요 시 question_type, reference_text 도 노출 가능
    # question_type: Optional[Literal['question', 'reference']] = None
    # reference_text: Optional[str] = None

class MGIndexBlock(BaseModel):
    """하나의 GRI 인덱스(=gri_item)와 그에 속한 질문들"""
    gri_index: str                 # ex) "404-1"
    item_id: int                   # gri_item.id
    item_title: Optional[str] = None
    frequency: Optional[int] = None  # issuepool_gri.frequency
    grade: Optional[Grade] = None    # issuepool_gri.grade
    questions: List[MGQuestion]
    model_config = ConfigDict(from_attributes=True)

class MGIndexResponse(BaseModel):
    """카테고리 기준으로 묶은 (인덱스→질문) 리스트"""
    category_id: int
    indexes: List[MGIndexBlock]

# ===== 인덱스 단위 윤문 =====

class MGPolishIndexRequest(BaseModel):
    """
    하나의 GRI 인덱스(예: '404-1')에 대해
    a,b,c... 질문들의 원문 답변을 함께 보내서 '한 번에' 윤문
    """
    session_key: str
    category_id: int
    gri_index: str
    # 두 가지 입력 형식을 모두 지원 (둘 중 하나만 보내면 됨)
    # 1) key_alpha 기반: {"a": "원문", "b": "원문", ...}
    answers_by_key: Optional[Dict[str, str]] = None
    # 2) question_id 기반
    answers_by_id: Optional[List[Dict[str, str]]] = None  # [{"question_id": 123, "raw_answer": "..."}, ...]

    # 메타 (옵션)
    thread_id: Optional[str] = None
    corporation_id: Optional[int] = None
    style: str = "중립"
    audience: str = "실무자"
    references: Optional[List[str]] = None
    extra_meta: Optional[Dict[str, Any]] = None


class MGPolishedSubAnswer(BaseModel):
    key_alpha: Optional[str] = None
    question_id: int
    polished_text: str


class MGPolishIndexResponse(BaseModel):
    session_key: str
    gri_index: str
    item_id: int
    item_title: Optional[str] = None
    # 인덱스 전체 윤문 텍스트(옵션: LLM이 통합 문장 생성)
    polished_index_text: Optional[str] = None
    # 각 서브문항 결과
    items: List[MGPolishedSubAnswer]
