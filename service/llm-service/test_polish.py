#!/usr/bin/env python3
"""
SLLM 윤문 기능 테스트 스크립트
훈련된 모델의 한국어 윤문 능력을 테스트합니다.
"""

from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import textwrap
import os

# 모델 경로 설정
MODEL_DIR = "./outputs/srlm-koalpaca-5.8b-qlora/merged"     # 모델
TOKENIZER_DIR = "./outputs/srlm-koalpaca-5.8b-qlora"         # 토크나이저(루트)

def load_model_and_tokenizer():
    """모델과 토크나이저 로드"""
    print("토크나이저 로딩 중...")
    tok = AutoTokenizer.from_pretrained(TOKENIZER_DIR, use_fast=True)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
    
    print("모델 로딩 중...")
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_DIR, 
        torch_dtype=torch.bfloat16, 
        device_map="auto",
        trust_remote_code=True
    )
    model.config.pad_token_id = tok.eos_token_id
    
    print("모델 로딩 완료!")
    return tok, model

def polish_with_gri(gri_index, text, tok, model):
    """GRI 인덱스를 포함한 텍스트 윤문 함수"""
    sys_prompt = (
        "### 역할: 지속가능보고서 한국어 윤문가\n"
        "### 지침: GRI 인덱스 요구사항을 고려하여 의미는 유지하되 간결·명료·중립 톤으로 다듬고, 불필요한 반복은 제거한다. 표/목록/코드 금지. 한 문단 3~5문장.\n"
    )
    prompt = f"{sys_prompt}\n### GRI 인덱스: {gri_index}\n### 원문:\n{text.strip()}\n\n### 윤문:\n"
    
    # 토크나이징
    ins = tok(prompt, return_tensors="pt").to(model.device)
    
    # token_type_ids 제거
    ins = {k: v for k, v in ins.items() if k != "token_type_ids"}
    
    with torch.no_grad():
        out = model.generate(
            **ins,
            max_new_tokens=220, 
            do_sample=True, 
            temperature=0.6, 
            top_p=0.9,
            eos_token_id=tok.eos_token_id, 
            pad_token_id=tok.eos_token_id
        )
    
    # 결과 추출
    full_response = tok.decode(out[0], skip_special_tokens=True)
    try:
        polished_text = full_response.split("### 윤문:")[-1].strip()
        return polished_text
    except:
        return full_response

def test_polish_samples(tok, model):
    """GRI 인덱스를 포함한 다양한 샘플로 윤문 테스트"""
    
    test_samples = [
        # 샘플 1: GRI 201-1 (경제적 가치)
        {
            "gri": "201-1",
            "text": """2022년 ABC의 경제 성과는 다음과 같습니다. 단위별로 정리하면, 경제적 가치의 창출에서는 매출액이 FY 2020년 43,859십억 원, FY 2021년 49,027십억 원, FY 2022년 45,730십억 원을 기록했고, 세전이익은 FY 2020년 4,912십억 원, FY 2021년 4,753십억 원, FY 2022년 5,534십억 원을 달성했으며, 당기순이익은 FY 2020년 3,330십억 원, FY 2021년 3,435십억 원, FY 2022년 3,890십억 원을 기록했습니다."""
        },
        
        # 샘플 2: GRI 403-3 (안전문화)
        {
            "gri": "403-3",
            "text": """ABC는 안전문화 내재화를 위해 다음과 같은 활동 프로그램을 운영하고 있습니다. 구분별로 세부 내용을 정리하면, 안전보건환경 점검에서는 산업안전보건 관련 법률 및 가이드라인 준수 여부를 확인하기 위해 외부 컨설턴트 입회 하에 전사 사업장 정기 점검을 연 3회 실시하고, 점검 결과에 대한 개선 활동 수행 및 DB화하여 이행 현황 및 수준을 관리하고 있습니다."""
        },
        
        # 샘플 3: GRI 305-6 (온실가스 배출)
        {
            "gri": "305-6",
            "text": """ABC는 2050년 탄소 중립 목표 달성을 위해 전사 차원의 온실가스 배출량 감축 전략을 수립하고 있으며, 이를 위해 재생에너지 사용 확대, 에너지 효율성 개선, 친환경 기술 개발 등 다양한 방안을 추진하고 있고, 특히 재생에너지 공급의 안정화를 위해 공공기관 및 재생에너지 플랫폼과 협력하여 MOU를 체결하여 조달 비용을 최소화하고 있으며, 이러한 전략적 대응을 통해 2050 탄소 중립 목표 달성 시 배출권 구매에 따른 재무적 부담을 줄일 수 있을 것으로 전망하고 있습니다."""
        },
        
        # 샘플 4: GRI 202-1 (최저임금)
        {
            "gri": "202-1",
            "text": """ABC는 전세계 사업장에서 모든 임직원에 대하여 최저 임금을 초과하는 초임 임금을 지급하고 있습니다. ABC 매출의 70% 이상은 국내에서 창출되며, 연결 보고 시 대상이 되는 종속기업인 4개사를 합한 총 5개사의 성별에 따른 최저임금 대비 초봉 비율은 다음과 같습니다."""
        },
        
        # 샘플 5: GRI 301-3 (재활용)
        {
            "gri": "301-3",
            "text": """ABC는 업계 내 플라스틱 줄이기 운동에 동참하여 지속가능한 패키징에 대해 연구하고 있습니다. ABC는 2027년까지 플라스틱 소재 제품을 100% 친환경 소재로 교체하는 목표를 설정하였습니다. 단위별로 정리하면, 제품 A의 제품 회수량은 FY 2020년 113,790톤, FY 2021년 122,718톤, FY 2022년 132,436톤을 기록했고, 해당 제품 판매량은 FY 2020년 620,510톤, FY 2021년 720,883톤, FY 2022년 857,446톤을 달성했습니다."""
        }
    ]
    
    print("=" * 80)
    print("🎯 GRI 인덱스 포함 윤문 기능 테스트 시작")
    print("=" * 80)
    
    for i, sample in enumerate(test_samples, 1):
        print(f"\n📝 샘플 {i} (GRI {sample['gri']}):")
        print("-" * 40)
        print(f"GRI 인덱스: {sample['gri']}")
        print("원문:")
        print(textwrap.indent(sample['text'], "  "))
        
        print("\n윤문:")
        try:
            polished = polish_with_gri(sample['gri'], sample['text'], tok, model)
            print(textwrap.indent(polished, "  "))
        except Exception as e:
            print(f"  ❌ 윤문 생성 실패: {e}")
        
        print("\n" + "=" * 80)

def interactive_polish(tok, model):
    """대화형 GRI 윤문 테스트"""
    print("\n" + "=" * 80)
    print("💬 대화형 GRI 윤문 테스트")
    print("=" * 80)
    print("GRI 인덱스와 텍스트를 입력하여 윤문을 테스트할 수 있습니다.")
    print("종료하려면 'quit' 또는 'exit'를 입력하세요.")
    print("-" * 80)
    
    while True:
        try:
            gri_input = input("\n🏷️ GRI 인덱스를 입력하세요 (예: 201-1): ").strip()
            
            if gri_input.lower() in ['quit', 'exit', '종료']:
                print("윤문 테스트를 종료합니다.")
                break
            
            if not gri_input:
                print("GRI 인덱스를 입력해주세요.")
                continue
            
            text_input = input("📝 윤문할 텍스트를 입력하세요: ").strip()
            
            if not text_input:
                print("텍스트를 입력해주세요.")
                continue
            
            print(f"\n🔄 GRI {gri_input}에 대한 윤문 중...")
            polished = polish_with_gri(gri_input, text_input, tok, model)
            
            print("\n✨ 윤문 결과:")
            print("-" * 40)
            print(f"GRI {gri_input}: {polished}")
            print("-" * 40)
            
        except KeyboardInterrupt:
            print("\n\n윤문 테스트를 종료합니다.")
            break
        except Exception as e:
            print(f"\n❌ 오류 발생: {e}")

def main():
    """메인 함수"""
    print("🚀 SLLM GRI 윤문 기능 테스트 시작")
    print("=" * 80)
    
    # 경로 확인
    if not os.path.exists(MODEL_DIR):
        print(f"❌ 모델 경로를 찾을 수 없습니다: {MODEL_DIR}")
        return
    
    if not os.path.exists(TOKENIZER_DIR):
        print(f"❌ 토크나이저 경로를 찾을 수 없습니다: {TOKENIZER_DIR}")
        return
    
    try:
        # 모델과 토크나이저 로드
        tok, model = load_model_and_tokenizer()
        
        # 1. GRI 포함 윤문 테스트
        test_polish_samples(tok, model)
        
        # 2. 대화형 테스트
        interactive_polish(tok, model)
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
