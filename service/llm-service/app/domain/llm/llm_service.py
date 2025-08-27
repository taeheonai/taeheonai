from __future__ import annotations
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import os
import json
import hashlib
import logging
from datetime import datetime

from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate

logger = logging.getLogger(__name__)

# ===== 데이터 모델 =====
@dataclass
class RequirementItem:
    requirement_key: str  # 'a' | 'b' | 'c' | 'd' ...
    input_text: str      # 사용자 원문(정제 전/후 텍스트)

@dataclass
class PolishResult:
    polished_text: str
    sources: List[Dict[str, Any]]     # [{"requirement":"a","hash":"..."}]
    model: str
    prompt_hash: str
    input_tokens: int
    output_tokens: int
    created_at_utc: str

# ===== 유틸 =====
def _sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def _hash_item(item: RequirementItem) -> str:
    return _sha256(json.dumps({"k": item.requirement_key, "t": item.input_text}, ensure_ascii=False))

class GriPolisher:
    """
    GRI 인덱스별 a/b/c/d 등 요구사항 원문을 받아,
    LangChain + OpenAI로 '중립 톤'의 윤문 결과를 생성.
    """
    def __init__(
        self,
        model: Optional[str] = None,
        temperature: float = 0.2,
        timeout: int = 60,
    ):
        self.model_name = model or os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")
        
        # OpenAI API 키 확인
        if not os.getenv("OPENAI_API_KEY"):
            raise ValueError("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.")
            
        # LangChain 클라이언트 초기화
        try:
            self.llm = ChatOpenAI(
                model=self.model_name,
                temperature=temperature,
                timeout=timeout,
            )
        except Exception as e:
            logger.error(f"LangChain 초기화 실패: {str(e)}")
            raise

        # system 지침(한국어)
        self.system_tmpl = (
            "너는 ESG 공시문 윤문 전문 보조자다. "
            "아래 입력(a/b/c/d 등)은 GRI {gri_index} 요구사항에 대한 원문이다. "
            "목표: 중립적, 간결, 사실 기반 문장으로 통일된 '최종 공시문'을 작성하라. "
            "과장/과도한 수사는 금지. 표/숫자/근거가 있으면 유지하고, 중복은 제거하라. "
            "조직/연도 등 고유명사는 일관되게 표기하고 논리적 흐름(맥락→수치→의미)을 만든다. "
            "출력은 한 개의 완성된 서술형 텍스트로 제공하라."
        )

        # human 템플릿
        self.human_tmpl = (
            "### 메타\n"
            "- GRI 인덱스: {gri_index}\n"
            "- 톤: {style}\n"
            "- 독자: {audience}\n\n"
            "### 입력 원문 목록\n"
            "{items_block}\n\n"
            "### 출력 지침\n"
            "- 하나의 통합 본문으로 작성\n"
            "- 불필요한 중복 제거, 용어 통일\n"
            "- 정책/프로세스/성과가 섞여 있으면 맥락 순서로 재배열\n"
            "- 필요 시 문단 구분(2~4문단), 불릿(선택) 허용\n"
        )

    def _build_items_block(self, items: List[RequirementItem]) -> str:
        """요구사항 목록을 문자열로 변환"""
        lines = []
        for it in sorted(items, key=lambda x: x.requirement_key):
            lines.append(f"- ({it.requirement_key}) {it.input_text}")
        return "\n".join(lines)

    def _prompt_hash(self, **kwargs) -> str:
        """프롬프트 해시 생성"""
        to_hash = json.dumps(kwargs, ensure_ascii=False, sort_keys=True)
        return _sha256(to_hash)

    def polish(
        self,
        *,
        gri_index: str,
        items: List[RequirementItem],
        style: str = "중립",
        audience: str = "실무자",
        extra_instructions: Optional[str] = None,
    ) -> PolishResult:
        """
        동기 함수. (FastAPI/비동기에서 쓰려면 아래 apolish 사용 권장)
        """
        try:
            items_block = self._build_items_block(items)
            system = self.system_tmpl.format(gri_index=gri_index)
            human = self.human_tmpl.format(
                gri_index=gri_index,
                style=style,
                audience=audience,
                items_block=items_block + (f"\n\n[추가 지침]\n{extra_instructions}" if extra_instructions else "")
            )

            prompt = ChatPromptTemplate.from_messages([
                ("system", system),
                ("human", "{human_input}")
            ])

            chain = prompt | self.llm
            ai_msg = chain.invoke({"human_input": human})

            # 토큰 사용량 계산
            usage = {}
            if hasattr(ai_msg, "usage_metadata") and isinstance(ai_msg.usage_metadata, dict):
                usage = ai_msg.usage_metadata
            elif hasattr(ai_msg, "response_metadata") and isinstance(ai_msg.response_metadata, dict):
                usage = ai_msg.response_metadata.get("token_usage", {})

            input_tokens = int(usage.get("input_tokens", usage.get("prompt_tokens", 0)) or 0)
            output_tokens = int(usage.get("output_tokens", usage.get("completion_tokens", 0)) or 0)

            sources = [{"requirement": it.requirement_key, "hash": _hash_item(it)} for it in items]
            p_hash = self._prompt_hash(
                system=self.system_tmpl,
                human=self.human_tmpl,
                gri_index=gri_index,
                style=style,
                audience=audience,
                model=self.model_name
            )

            return PolishResult(
                polished_text=str(ai_msg.content).strip(),
                sources=sources,
                model=self.model_name,
                prompt_hash=p_hash,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                created_at_utc=datetime.utcnow().isoformat()
            )

        except Exception as e:
            logger.error(f"Polish 실패: {str(e)}")
            raise

    async def apolish(
        self,
        *,
        gri_index: str,
        items: List[RequirementItem],
        style: str = "중립",
        audience: str = "실무자",
        extra_instructions: Optional[str] = None,
    ) -> PolishResult:
        """
        비동기 함수(FastAPI/async 세션과 궁합 좋음)
        """
        try:
            items_block = self._build_items_block(items)
            system = self.system_tmpl.format(gri_index=gri_index)
            human = self.human_tmpl.format(
                gri_index=gri_index,
                style=style,
                audience=audience,
                items_block=items_block + (f"\n\n[추가 지침]\n{extra_instructions}" if extra_instructions else "")
            )

            prompt = ChatPromptTemplate.from_messages([
                ("system", system),
                ("human", "{human_input}")
            ])

            chain = prompt | self.llm
            ai_msg = await chain.ainvoke({"human_input": human})

            # 토큰 사용량 계산
            usage = {}
            if hasattr(ai_msg, "usage_metadata") and isinstance(ai_msg.usage_metadata, dict):
                usage = ai_msg.usage_metadata
            elif hasattr(ai_msg, "response_metadata") and isinstance(ai_msg.response_metadata, dict):
                usage = ai_msg.response_metadata.get("token_usage", {})

            input_tokens = int(usage.get("input_tokens", usage.get("prompt_tokens", 0)) or 0)
            output_tokens = int(usage.get("output_tokens", usage.get("completion_tokens", 0)) or 0)

            sources = [{"requirement": it.requirement_key, "hash": _hash_item(it)} for it in items]
            p_hash = self._prompt_hash(
                system=self.system_tmpl,
                human=self.human_tmpl,
                gri_index=gri_index,
                style=style,
                audience=audience,
                model=self.model_name
            )

            return PolishResult(
                polished_text=str(ai_msg.content).strip(),
                sources=sources,
                model=self.model_name,
                prompt_hash=p_hash,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                created_at_utc=datetime.utcnow().isoformat()
            )

        except Exception as e:
            logger.error(f"Async polish 실패: {str(e)}")
            raise