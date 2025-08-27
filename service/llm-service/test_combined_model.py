import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

def load_model_and_tokenizer(base_path, merged_path):
    """모델과 토크나이저 로드"""
    print(f"토크나이저 로딩 중: {base_path}")
    tokenizer = AutoTokenizer.from_pretrained(base_path, use_fast=True)
    
    print(f"통합 모델 로딩 중: {merged_path}")
    model = AutoModelForCausalLM.from_pretrained(
        merged_path,
        torch_dtype=torch.bfloat16,
        trust_remote_code=True,
        low_cpu_mem_usage=True,
    )
    
    print("GPU로 모델 이동 중...")
    model = model.cuda()
    model.eval()
    
    return tokenizer, model

def generate_response(prompt, tokenizer, model, max_length=1024):
    """모델 응답 생성"""
    inputs = tokenizer(prompt, return_tensors="pt", add_special_tokens=True)
    
    if 'token_type_ids' in inputs:
        del inputs['token_type_ids']
    
    inputs = {k: v.to(model.device) for k, v in inputs.items()}
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_length=max_length,
            temperature=0.8,
            top_p=0.9,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
            repetition_penalty=1.1,
        )
    
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return response

def test_combined_model():
    """통합 모델 테스트"""
    print("🚀 통합 모델 테스트 시작!")
    print("(기존 GRI 데이터 + 한온시스템 데이터 모두 학습됨)")
    
    # 모델 경로
    base_path = "./outputs/srlm-koalpaca-5.8b-qlora"
    merged_path = "./outputs/srlm-koalpaca-5.8b-qlora/merged"
    
    # 경로 확인
    if not os.path.exists(base_path):
        print(f"❌ 베이스 경로를 찾을 수 없습니다: {base_path}")
        return
    if not os.path.exists(merged_path):
        print(f"❌ 병합 모델 경로를 찾을 수 없습니다: {merged_path}")
        return
    
    try:
        # 모델 로드
        tokenizer, model = load_model_and_tokenizer(base_path, merged_path)
        print("✅ 통합 모델 로드 완료!")
        
        # 테스트 케이스들 (기존 GRI + 한온시스템)
        test_cases = [
            {
                "name": "기존 GRI 201-1 (경제적 성과)",
                "gri": "201-1",
                "description": "조직이 창출한 경제적 가치와 배분에 대한 정보"
            },
            {
                "name": "한온시스템 GRI 403-4 (안전보건 조직)",
                "gri": "403-4", 
                "description": "안전보건경영을 담당하는 조직 구조와 책임"
            },
            {
                "name": "한온시스템 GRI 306-1 (폐기물 영향)",
                "gri": "306-1",
                "description": "조직 활동이 환경에 미치는 폐기물 관련 영향"
            },
            {
                "name": "기존 GRI 202-1 (최저임금)",
                "gri": "202-1",
                "description": "최저임금 대비 초임 비율"
            }
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n{'='*80}")
            print(f"테스트 {i}: {test_case['name']}")
            print(f"GRI: {test_case['gri']}")
            print(f"설명: {test_case['description']}")
            print(f"{'='*80}")
            
            # 프롬프트 구성
            prompt = (
                "### 역할: 지속가능보고서(SR) 작성 전문가\n"
                "### 지시문:\n"
                f"다음 GRI {test_case['gri']} 요구사항을 충족하는 공시 초안을 작성하라. 톤은 중립, 한국어.\n"
                f"GRI {test_case['gri']}는 {test_case['description']}에 관한 것입니다.\n"
                "구체적이고 실무적인 내용으로 작성하고, 필요시 표나 리스트 형태로 구성하라.\n\n"
                "### 입력:\n"
                f"{test_case['gri']}\n\n"
                "### 응답:\n"
            )
            
            print(f"프롬프트 전송 중...")
            response = generate_response(prompt, tokenizer, model, max_length=1024)
            
            # 응답에서 프롬프트 제거
            if "### 응답:" in response:
                answer = response.split("### 응답:")[-1].strip()
            else:
                answer = response
            
            print(f"\n✅ 생성된 응답:")
            print(f"{answer}")
            
            # 응답 품질 평가
            print(f"\n📊 응답 품질 평가:")
            print(f"- 길이: {len(answer)} 문자")
            print(f"- GRI 인덱스 포함: {'✅' if test_case['gri'] in answer else '❌'}")
            print(f"- 구체적 내용: {'✅' if len(answer) > 100 else '❌'}")
            
        print(f"\n{'='*80}")
        print("🎉 모든 테스트 완료!")
        print("이제 기존 GRI 데이터와 한온시스템 데이터를 모두 학습한 통합 모델이 준비되었습니다!")
        print(f"{'='*80}")
        
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()

def interactive_test():
    """대화형 테스트"""
    print("\n💬 대화형 테스트를 시작합니다!")
    print("종료하려면 'quit' 또는 'exit'를 입력하세요.")
    
    base_path = "./outputs/srlm-koalpaca-5.8b-qlora"
    merged_path = "./outputs/srlm-koalpaca-5.8b-qlora/merged"
    
    try:
        tokenizer, model = load_model_and_tokenizer(base_path, merged_path)
        print("✅ 통합 모델 로드 완료! 대화를 시작하세요.")
        
        while True:
            print("\n" + "-"*50)
            gri_input = input("GRI 인덱스를 입력하세요 (예: 201-1, 403-4): ").strip()
            
            if gri_input.lower() in ['quit', 'exit', '종료']:
                print("대화형 테스트를 종료합니다.")
                break
            
            if not gri_input:
                print("GRI 인덱스를 입력해주세요.")
                continue
            
            # 프롬프트 구성
            prompt = (
                "### 역할: 지속가능보고서(SR) 작성 전문가\n"
                "### 지시문:\n"
                f"다음 GRI {gri_input} 요구사항을 충족하는 공시 초안을 작성하라. 톤은 중립, 한국어.\n"
                "구체적이고 실무적인 내용으로 작성하라.\n\n"
                "### 입력:\n"
                f"{gri_input}\n\n"
                "### 응답:\n"
            )
            
            print(f"\n생성 중...")
            response = generate_response(prompt, tokenizer, model, max_length=1024)
            
            # 응답만 표시
            if "### 응답:" in response:
                answer = response.split("### 응답:")[-1].strip()
            else:
                answer = response
            
            print(f"\n✅ 생성된 응답:")
            print(f"{answer}")
            
    except Exception as e:
        print(f"❌ 대화형 테스트 중 오류 발생: {e}")

if __name__ == "__main__":
    print("🎯 통합 모델 테스트")
    print("1. 자동 테스트 (기존 GRI + 한온시스템)")
    print("2. 대화형 테스트")
    
    choice = input("선택하세요 (1 또는 2): ").strip()
    
    if choice == "1":
        test_combined_model()
    elif choice == "2":
        interactive_test()
    else:
        print("잘못된 선택입니다. 자동 테스트를 실행합니다.")
        test_combined_model()
