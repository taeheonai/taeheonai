# app/domain/entity/grireport_entity.py
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Integer, Text, DateTime, Boolean, func, text
from app.common.database import Base  # Declarative Base

class GRIReport(Base):
    __tablename__ = "grireport"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    corporation_id: Mapped[int] = mapped_column(Integer, nullable=False)
    issuepool_id: Mapped[int] = mapped_column(Integer, nullable=True)  # GRI Intake에서는 null
    
    # GRI 표준 정보
    standard_code: Mapped[str] = mapped_column(Text, nullable=False)  # GRI-101, GRI-102 등
    question_id: Mapped[str] = mapped_column(Text, nullable=False)   # a, b, c 등 질문 식별자
    
    # ESG 분류 (Materiality-GRI에서만 사용, GRI Intake에서는 null)
    esg_classification_id: Mapped[int] = mapped_column(Integer, nullable=True)  # 1:E, 2:S, 3:G
    
    # 답변 및 윤문 결과
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)   # 사용자가 입력한 답변
    polished_text: Mapped[str] = mapped_column(Text, nullable=True)  # 윤문된 텍스트
    display_mode: Mapped[str] = mapped_column(Text, nullable=False, default='prose')  # 표시 모드: 'table' 또는 'prose'
    
    # 보고서 타입 구분
    report_type: Mapped[str] = mapped_column(Text, nullable=False, default='intake')  # 'intake' 또는 'materiality'
    
    # 메타데이터
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_saved: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text('false')
    )  # 저장 버튼 눌렀는지 여부