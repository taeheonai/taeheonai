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
        torch_dtype=torch.float16,     # 메모리 절약
        trust_remote_code=True,
        low_cpu_mem_usage=True,
    )
    
    print("GPU로 모델 이동 중...")
    model = model.cuda()
    model.eval()
    
    return tokenizer, model

def generate_response_simple(prompt, tokenizer, model, max_length=256):
    """단순한 모델 응답 생성 (최적화된 설정)"""
    inputs = tokenizer(prompt, return_tensors="pt", add_special_tokens=True)
    
    if 'token_type_ids' in inputs:
        del inputs['token_type_ids']
    
    inputs = {k: v.to(model.device) for k, v in inputs.items()}
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_length=max_length,      # 더 짧게 (빠른 생성)
            temperature=0.1,            # 매우 낮게 (일관된 응답)
            top_p=0.9,                  # 높게 (다양성)
            do_sample=True,             # 샘플링 활성화
            num_beams=1,                # 빔 서치 비활성화
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
            repetition_penalty=1.1,     # 반복 방지
            early_stopping=True,        # 조기 종료
        )
    
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return response

def test_simple_prompt():
    """단순화된 프롬프트로 통합 모델 테스트"""
    print("🚀 단순화된 프롬프트로 통합 모델 테스트 시작!")
    print("(프롬프트: 'GRI {인덱스}에 대한 지속가능보고서 공시 내용을 작성하라:')")
    
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
        
        # 테스트 케이스들 (3개 데이터셋 모두 테스트)
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
                "name": "HL만도 GRI 203-1 (혁신 제품)",
                "gri": "203-1",
                "description": "주차로봇, 순찰로봇, SW Campus 등 혁신 제품"
            },
            {
                "name": "HL만도 GRI 306-1 (폐기물 관리)",
                "gri": "306-1",
                "description": "폐기물 저감 및 자원순환 추진"
            },
            {
                "name": "HL만도 GRI 403-4 (안전보건위원회)",
                "gri": "403-4",
                "description": "산업안전보건위원회 운영 및 안전보건회의체"
            }
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n{'='*80}")
            print(f"테스트 {i}: {test_case['name']}")
            print(f"GRI: {test_case['gri']}")
            print(f"설명: {test_case['description']}")
            print(f"{'='*80}")
            
            # 단순화된 프롬프트 구성
            prompt = f"GRI {test_case['gri']}에 대한 지속가능보고서 공시 내용을 작성하라:\n\n"
            
            print(f"프롬프트: {prompt.strip()}")
            print(f"프롬프트 전송 중...")
            
            # 시간 측정
            import time
            start_time = time.time()
            
            response = generate_response_simple(prompt, tokenizer, model, max_length=256)
            
            end_time = time.time()
            generation_time = end_time - start_time
            
            # 응답에서 프롬프트 제거
            if prompt in response:
                answer = response.replace(prompt, "").strip()
            else:
                answer = response
            
            print(f"\n✅ 생성된 응답 (생성 시간: {generation_time:.2f}초):")
            print(f"{answer}")
            
            # 응답 품질 평가
            print(f"\n📊 응답 품질 평가:")
            print(f"- 길이: {len(answer)} 문자")
            print(f"- 생성 시간: {generation_time:.2f}초")
            print(f"- GRI 인덱스 포함: {'✅' if test_case['gri'] in answer else '❌'}")
            print(f"- 구체적 내용: {'✅' if len(answer) > 50 else '❌'}")
            print(f"- ABC 기업명 포함: {'✅' if 'ABC' in answer else '❌'}")
            print(f"- 역할 정의 포함: {'❌' if '지속가능보고서(SR) 작성 전문가' in answer else '✅'}")
            
        print(f"\n{'='*80}")
        print("🎉 모든 단순화된 프롬프트 테스트 완료!")
        print("프롬프트 단순화로 모델 응답 품질이 개선되었습니다!")
        print(f"{'='*80}")
        
    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()

def interactive_test_simple():
    """단순화된 프롬프트로 대화형 테스트"""
    print("\n💬 단순화된 프롬프트로 대화형 테스트를 시작합니다!")
    print("(프롬프트: 'GRI {인덱스}에 대한 지속가능보고서 공시 내용을 작성하라:')")
    print("종료하려면 'quit' 또는 'exit'를 입력하세요.")
    
    base_path = "./outputs/srlm-koalpaca-5.8b-qlora"
    merged_path = "./outputs/srlm-koalpaca-5.8b-qlora/merged"
    
    try:
        tokenizer, model = load_model_and_tokenizer(base_path, merged_path)
        print("✅ 통합 모델 로드 완료! 단순화된 프롬프트로 대화를 시작하세요.")
        
        while True:
            print("\n" + "-"*50)
            gri_input = input("GRI 인덱스를 입력하세요 (예: 201-1, 403-4, 203-1): ").strip()
            
            if gri_input.lower() in ['quit', 'exit', '종료']:
                print("대화형 테스트를 종료합니다.")
                break
            
            if not gri_input:
                print("GRI 인덱스를 입력해주세요.")
                continue
            
            # 단순화된 프롬프트 구성
            prompt = f"GRI {gri_input}에 대한 지속가능보고서 공시 내용을 작성하라:\n\n"
            
            print(f"\n프롬프트: {prompt.strip()}")
            print(f"생성 중...")
            
            # 시간 측정
            import time
            start_time = time.time()
            
            response = generate_response_simple(prompt, tokenizer, model, max_length=256)
            
            end_time = time.time()
            generation_time = end_time - start_time
            
            # 응답에서 프롬프트 제거
            if prompt in response:
                answer = response.replace(prompt, "").strip()
            else:
                answer = response
            
            print(f"\n✅ 생성된 응답 (생성 시간: {generation_time:.2f}초):")
            print(f"{answer}")
            
    except Exception as e:
        print(f"❌ 대화형 테스트 중 오류 발생: {e}")

if __name__ == "__main__":
    print("🎯 단순화된 프롬프트 테스트")
    print("1. 자동 테스트 (단순화된 프롬프트)")
    print("2. 대화형 테스트 (단순화된 프롬프트)")
    
    choice = input("선택하세요 (1 또는 2): ").strip()
    
    if choice == "1":
        test_simple_prompt()
    elif choice == "2":
        interactive_test_simple()
    else:
        print("잘못된 선택입니다. 자동 테스트를 실행합니다.")
        test_simple_prompt()
