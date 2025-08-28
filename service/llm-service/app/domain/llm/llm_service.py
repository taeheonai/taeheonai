from __future__ import annotations
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import os
import json
import hashlib
import logging
from datetime import datetime
from pathlib import Path

from langchain_community.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate

logger = logging.getLogger(__name__)

def load_gri_examples() -> Dict[str, Dict[str, Any]]:
    """GRI 예시 데이터를 로드하는 함수"""
    examples = {}
    try:
        # 현재 파일 기준으로 상대 경로 계산
        current_dir = Path(__file__).parent.parent.parent.parent
        jsonl_path = current_dir / "data" / "gri_all.jsonl"
        
        with open(jsonl_path, 'r', encoding='utf-8') as f:
            for line in f:
                data = json.loads(line)
                # input이 GRI 인덱스를 나타냄
                gri_index = data.get('input')
                if gri_index:
                    examples[gri_index] = data
        logger.info(f"Loaded {len(examples)} GRI examples from {jsonl_path}")
        return examples
    except Exception as e:
        logger.error(f"Failed to load GRI examples: {str(e)}")
        return {}

# ===== 데이터 모델 =====
@dataclass
class RequirementItem:
    question_id: int     # 질문 ID
    key_alpha: str       # 'a' | 'b' | 'c' | 'd' ...
    text: str           # 사용자 원문

# ===== 유틸 =====
def _sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def _hash_item(item: RequirementItem) -> str:
    return _sha256(json.dumps({"k": item.key_alpha, "t": item.text}, ensure_ascii=False))

class GriPolisher:
    """
    GRI 인덱스별 a/b/c/d 등 요구사항 원문을 받아,
    LangChain + OpenAI로 '중립 톤'의 윤문 결과를 생성.
    """
    def __init__(
        self,
        model: str,
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
            # GRI 예시 데이터 로드
            self.gri_examples = load_gri_examples()
            logger.info(f"Initialized GriPolisher with {len(self.gri_examples)} GRI examples")
        except Exception as e:
            logger.error(f"LangChain 초기화 실패: {str(e)}")
            raise

        # system 지침(한국어)
        self.system_tmpl = (
            "너는 ESG 공시문 윤문 전문 보조자다. "
            "아래 입력(a/b/c/d 등)은 GRI {gri_index} 요구사항에 대한 원문이다. "
            "목표: GRI 공시 기준에 맞춰 중립적, 간결, 사실 기반 문장으로 통일된 '최종 공시문'을 작성하라. "
            "참고: gri_all.jsonl 파일의 해당 GRI 인덱스 예시를 참고하여 구조와 형식을 일관되게 유지하라. "
            "과장/과도한 수사는 금지. 표/숫자/근거가 있으면 유지하고, 중복은 제거하라. "
            "조직/연도 등 고유명사는 일관되게 표기하고 논리적 흐름(맥락→수치→의미)을 만든다. "
            "정량 데이터는 표 형식으로 제시하고, 정성적 설명은 서술형으로 작성하라. "
            "출력은 한 개의 완성된 서술형 텍스트로 제공하라."
        )

        # human 템플릿
        self.human_tmpl = (
            "### 메타\n"
            "- GRI 인덱스: {gri_index}\n"
            "- 톤: 중립\n\n"
            "### 참고 예시\n"
            "gri_all.jsonl 파일에서 GRI {gri_index} 인덱스의 예시를 참고하여 작성하세요.\n"
            "특히 다음 요소들을 주의 깊게 살펴보세요:\n"
            "- 데이터 구조화 방식 (표/서술)\n"
            "- 정량/정성 데이터 배치\n"
            "- 용어 사용과 표현 방식\n\n"
            "### 입력 원문 목록\n"
            "{items_block}\n\n"
            "### 출력 지침\n"
            "- 하나의 통합 본문으로 작성\n"
            "- 불필요한 중복 제거, 용어 통일\n"
            "- 정책/프로세스/성과가 섞여 있으면 맥락 순서로 재배열\n"
            "- 필요 시 문단 구분(2~4문단), 불릿(선택) 허용\n"
            "- 정량 데이터는 표 형식으로 구조화\n"
            "- 정성적 설명은 명확하고 간결한 서술형으로 작성\n"
        )

    def _build_items_block(self, items: List[RequirementItem]) -> str:
        """요구사항 목록을 문자열로 변환"""
        lines = []
        for it in sorted(items, key=lambda x: x.key_alpha):
            lines.append(f"- ({it.key_alpha}) {it.text}")
        return "\n".join(lines)

    def polish(
        self,
        *,
        gri_index: str,
        items: List[RequirementItem],
        extra_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        동기 함수. (FastAPI/비동기에서 쓰려면 아래 apolish 사용 권장)
        """
        try:
            items_block = self._build_items_block(items)
            system = self.system_tmpl.format(gri_index=gri_index)
            # 해당 GRI 인덱스의 예시 데이터 가져오기
            example_data = self.gri_examples.get(gri_index, {})
            example_instruction = example_data.get('instruction', '')
            example_answer = example_data.get('answer', '')
            
            # 예시 데이터를 포함한 human 프롬프트 구성
            human = self.human_tmpl.format(
                gri_index=gri_index,
                items_block=items_block + (f"\n\n[추가 지침]\n{extra_instructions}" if extra_instructions else "")
            )
            
            if example_instruction and example_answer:
                human += f"\n\n### GRI {gri_index} 참고 예시\n"
                human += f"요구사항: {example_instruction}\n"
                human += f"답변 예시:\n{example_answer}\n"

            prompt = ChatPromptTemplate.from_messages([
                ("system", system),
                ("human", "{human_input}")
            ])

            chain = prompt | self.llm
            ai_msg = chain.invoke({"human_input": human})

            sources = [{"requirement": it.key_alpha, "hash": _hash_item(it)} for it in items]

            return {
                "polished_text": str(ai_msg.content).strip(),
                "sources": sources,
                "model": self.model_name,
                "created_at": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Polish 실패: {str(e)}")
            raise

    async def apolish(
        self,
        *,
        gri_index: str,
        items: List[RequirementItem],
        extra_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        비동기 함수(FastAPI/async 세션과 궁합 좋음)
        """
        try:
            items_block = self._build_items_block(items)
            system = self.system_tmpl.format(gri_index=gri_index)
            # 해당 GRI 인덱스의 예시 데이터 가져오기
            example_data = self.gri_examples.get(gri_index, {})
            example_instruction = example_data.get('instruction', '')
            example_answer = example_data.get('answer', '')
            
            # 예시 데이터를 포함한 human 프롬프트 구성
            human = self.human_tmpl.format(
                gri_index=gri_index,
                items_block=items_block + (f"\n\n[추가 지침]\n{extra_instructions}" if extra_instructions else "")
            )
            
            if example_instruction and example_answer:
                human += f"\n\n### GRI {gri_index} 참고 예시\n"
                human += f"요구사항: {example_instruction}\n"
                human += f"답변 예시:\n{example_answer}\n"

            prompt = ChatPromptTemplate.from_messages([
                ("system", system),
                ("human", "{human_input}")
            ])

            chain = prompt | self.llm
            ai_msg = await chain.ainvoke({"human_input": human})

            sources = [{"requirement": it.key_alpha, "hash": _hash_item(it)} for it in items]

            return {
                "polished_text": str(ai_msg.content).strip(),
                "sources": sources,
                "model": self.model_name,
                "created_at": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Async polish 실패: {str(e)}")
            raise