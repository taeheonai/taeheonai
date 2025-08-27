#!/usr/bin/env python3
"""
SLLM 모델 평가 스크립트
훈련된 모델의 성능을 테스트 데이터로 평가합니다.
"""

import json
import torch
import os
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import re
from typing import List, Dict

def load_model_and_tokenizer(base_path: str, merged_path: str):
    """훈련된 모델과 토크나이저 로드"""
    # 토크나이저는 base_path에서 로드 (tokenizer.json이 있는 곳)
    tokenizer = AutoTokenizer.from_pretrained(base_path)
    
    # 모델은 merged_path에서 로드
    model = AutoModelForCausalLM.from_pretrained(
        merged_path,
        torch_dtype=torch.bfloat16,
        device_map="auto",
        trust_remote_code=True
    )
    return tokenizer, model

def extract_gri_index(text: str) -> str:
    """생성된 텍스트에서 GRI 인덱스 추출"""
    # GRI 인덱스 패턴 매칭 (예: 201-1, 301-3 등)
    pattern = r'\b(\d{3}-\d+)\b'
    match = re.search(pattern, text)
    return match.group(1) if match else ""

def evaluate_model(model, tokenizer, test_data: List[Dict]) -> Dict:
    """모델 성능 평가"""
    
    results = {
        "total": len(test_data),
        "correct_gri": 0,
        "correct_format": 0,
        "partial_correct": 0,
        "incorrect": 0,
        "details": []
    }
    
    for i, test_item in enumerate(test_data):
        print(f"평가 중... ({i+1}/{len(test_data)})")
        
        # 프롬프트 구성
        prompt = f"""### 역할: 지속가능보고서(SR) 작성 전문가
### 지시문:
{test_item['instruction']}

### 입력:
{test_item['input']}

### 응답:
"""
        
        # 모델 추론
        inputs = tokenizer(prompt, return_tensors="pt", add_special_tokens=True)
        # 불필요한 파라미터 제거
        if 'token_type_ids' in inputs:
            del inputs['token_type_ids']
        inputs = {k: v.to(model.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=512,
                temperature=0.7,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
        
        generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        response = generated_text[len(prompt):].strip()
        
        # 정답과 비교
        expected_gri = test_item['input']
        predicted_gri = extract_gri_index(response)
        
        # 평가 기준
        gri_correct = expected_gri == predicted_gri
        format_correct = len(response) > 50 and "\t" in response  # 표 형식 포함
        
        if gri_correct and format_correct:
            results["correct_gri"] += 1
            results["correct_format"] += 1
            score = "완벽"
        elif gri_correct:
            results["correct_gri"] += 1
            score = "GRI 인덱스 정확"
        elif format_correct:
            results["partial_correct"] += 1
            score = "형식만 정확"
        else:
            results["incorrect"] += 1
            score = "부정확"
        
        # 상세 결과 저장
        results["details"].append({
            "test_id": i + 1,
            "expected_gri": expected_gri,
            "predicted_gri": predicted_gri,
            "expected_answer": test_item['answer'][:100] + "...",
            "generated_response": response[:200] + "...",
            "score": score,
            "gri_correct": gri_correct,
            "format_correct": format_correct
        })
    
    # 정확도 계산
    results["gri_accuracy"] = results["correct_gri"] / results["total"]
    results["format_accuracy"] = results["correct_format"] / results["total"]
    results["overall_accuracy"] = (results["correct_gri"] + results["partial_correct"]) / results["total"]
    
    return results

def main():
    # 모델 경로 설정
    base_path = "./outputs/srlm-koalpaca-5.8b-qlora"  # 토크나이저가 있는 곳
    merged_path = "./outputs/srlm-koalpaca-5.8b-qlora/merged"  # 병합된 모델이 있는 곳
    
    print("모델 로딩 중...")
    print(f"토크나이저 경로: {base_path}")
    print(f"모델 경로: {merged_path}")
    
    # 경로 존재 확인
    if not os.path.exists(base_path):
        raise FileNotFoundError(f"베이스 경로를 찾을 수 없습니다: {base_path}")
    if not os.path.exists(merged_path):
        raise FileNotFoundError(f"병합된 모델 경로를 찾을 수 없습니다: {merged_path}")
    
    tokenizer, model = load_model_and_tokenizer(base_path, merged_path)
    
    print("테스트 데이터 로딩 중...")
    with open("test_data.jsonl", "r", encoding="utf-8") as f:
        test_data = [json.loads(line) for line in f]
    
    print("모델 평가 시작...")
    results = evaluate_model(model, tokenizer, test_data)
    
    # 결과 출력
    print("\n" + "="*50)
    print("평가 결과")
    print("="*50)
    print(f"총 테스트 수: {results['total']}")
    print(f"GRI 인덱스 정확도: {results['gri_accuracy']:.2%}")
    print(f"형식 정확도: {results['format_accuracy']:.2%}")
    print(f"전체 정확도: {results['overall_accuracy']:.2%}")
    print(f"\n상세 결과:")
    
    for detail in results["details"]:
        print(f"테스트 {detail['test_id']}: {detail['expected_gri']} -> {detail['predicted_gri']} ({detail['score']})")
    
    # 결과 저장
    with open("evaluation_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print("\n평가 결과가 evaluation_results.json에 저장되었습니다.")

if __name__ == "__main__":
    main()
