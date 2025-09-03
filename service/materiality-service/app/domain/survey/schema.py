from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class SurveyCategorySchema(BaseModel):
    """설문 카테고리 스키마 (Frontend 데이터 구조에 맞춤)"""
    question_number: int = Field(..., description="질문 번호")
    rank: int = Field(..., description="순위")
    category: str = Field(..., description="카테고리명")
    selected_base_issue_pool: str = Field(..., description="선택된 base issue pool")
    esg_classification: str = Field(..., description="ESG 분류")
    final_score: float = Field(..., description="최종 점수")
    frequency_score: Optional[float] = Field(None, description="빈도 점수")
    relevance_score: Optional[float] = Field(None, description="관련성 점수")
    recent_score: Optional[float] = Field(None, description="최신성 점수")
    rank_score: Optional[float] = Field(None, description="순위 점수")
    reference_score: Optional[float] = Field(None, description="참조 점수")
    negative_score: Optional[float] = Field(None, description="부정 점수")

class SurveyParticipantSchema(BaseModel):
    """설문 참여자 스키마"""
    name: str = Field(..., description="참여자 이름")
    company: str = Field(..., description="참여자 회사")
    position: str = Field(..., description="참여자 직책")
    email: str = Field(..., description="참여자 이메일")

class SurveyResponseSchema(BaseModel):
    """설문 응답 스키마 (Frontend 데이터 구조에 맞춤)"""
    id: str = Field(..., description="응답 항목 ID")
    title: str = Field(..., description="응답 항목 제목")
    description: Optional[str] = Field(None, description="응답 항목 설명")
    outsideScore: Optional[int] = Field(None, ge=1, le=5, description="Outside-in 점수 (1-5)")
    insideScore: Optional[int] = Field(None, ge=1, le=5, description="Inside-out 점수 (1-5)")
    category: str = Field(..., description="카테고리명")
    esg_classification: str = Field(..., description="ESG 분류")
    rank: int = Field(..., description="순위")
    section: Optional[str] = Field(None, description="ESG 섹션")

class SurveyCreateRequest(BaseModel):
    """설문 생성 요청 스키마 (Frontend 데이터 구조에 맞춤)"""
    corporation_id: str = Field(..., description="회사 ID (corporation_id로 통일)")
    categories: List[Dict[str, Any]] = Field(..., description="설문 카테고리 목록 (실제 데이터 구조)")
    excel_data: Optional[Dict[str, Any]] = Field(None, description="엑셀 데이터")
    content_hash: Optional[str] = Field(None, description="설문 내용 해시값 (동일 내용 판단용)")
    send_email: Optional[bool] = Field(False, description="이메일 발송 여부")
    company_name: Optional[str] = Field(None, description="회사명 (이메일 발송용)")

class SurveyResponseRequest(BaseModel):
    """설문 응답 요청 스키마 (Frontend 데이터 구조에 맞춤)"""
    survey_id: str = Field(..., description="설문 ID")
    corporation_id: str = Field(..., description="회사 ID (corporation_id로 통일)")
    participant: SurveyParticipantSchema = Field(..., description="참여자 정보")
    responses: List[Dict[str, Any]] = Field(..., description="응답 목록 (실제 데이터 구조)")

class SurveyDataResponse(BaseModel):
    """설문 데이터 응답 스키마"""
    survey_id: str = Field(..., description="설문 ID")
    corporation_id: str = Field(..., description="회사 ID")
    content_hash: Optional[str] = Field(None, description="설문 내용 해시값")
    timestamp: datetime = Field(..., description="생성 시간")
    total_categories: int = Field(..., description="총 카테고리 수")
    categories: List[Dict[str, Any]] = Field(..., description="카테고리 데이터")
    excel_data: Optional[Dict[str, Any]] = Field(None, description="엑셀 데이터")

class SurveyResponsesResponse(BaseModel):
    """설문 응답 목록 응답 스키마"""
    survey_id: str = Field(..., description="설문 ID")
    corporation_id: str = Field(..., description="회사 ID")
    total_responses: int = Field(..., description="총 응답 수")
    responses: List[Dict[str, Any]] = Field(..., description="응답 목록")

class SurveyListResponse(BaseModel):
    """설문 목록 응답 스키마"""
    surveys: List[SurveyDataResponse] = Field(..., description="설문 목록")
    total_count: int = Field(..., description="총 설문 수")
