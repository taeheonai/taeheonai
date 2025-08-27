#!/usr/bin/env python3
"""
GRI 테스트 데이터 생성 스크립트
훈련 데이터를 기반으로 40개의 테스트 데이터를 생성하여 모델 성능을 평가합니다.
"""

import json
import random
from typing import List, Dict
import os

def load_training_data(file_path: str) -> List[Dict]:
    """훈련 데이터 로드"""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = [json.loads(line) for line in f]
    return data

def create_test_data(training_data: List[Dict], num_test: int = 40) -> List[Dict]:
    """테스트 데이터 생성"""
    
    # GRI 인덱스별로 데이터 그룹화
    gri_groups = {}
    for item in training_data:
        gri_index = item['input']
        if gri_index not in gri_groups:
            gri_groups[gri_index] = []
        gri_groups[gri_index].append(item)
    
    print(f"총 {len(gri_groups)}개의 고유 GRI 인덱스 발견")
    
    # 테스트 데이터 생성
    test_data = []
    used_gri_indices = set()
    
    # 1. 다양한 GRI 인덱스에서 선택 (최대 40개)
    available_gri = list(gri_groups.keys())
    random.shuffle(available_gri)
    
    for gri_index in available_gri[:num_test]:
        if len(test_data) >= num_test:
            break
            
        # 해당 GRI 인덱스의 데이터 중 하나 선택
        item = random.choice(gri_groups[gri_index])
        
        # 테스트용으로 변형
        test_item = {
            "instruction": item["instruction"],
            "input": item["input"],
            "answer": item["answer"],  # 정답은 그대로 유지 (평가용)
            "meta": item["meta"]
        }
        
        test_data.append(test_item)
        used_gri_indices.add(gri_index)
    
    # 2. 부족한 경우 일부 GRI 인덱스를 중복 사용
    remaining = num_test - len(test_data)
    if remaining > 0:
        print(f"추가로 {remaining}개 데이터 생성...")
        
        # 이미 사용된 GRI 인덱스에서 추가 선택
        for gri_index in used_gri_indices:
            if len(test_data) >= num_test:
                break
                
            # 같은 GRI 인덱스의 다른 예시 선택
            available_items = [item for item in gri_groups[gri_index] 
                             if item not in test_data]
            
            if available_items:
                item = random.choice(available_items)
                test_item = {
                    "instruction": item["instruction"],
                    "input": item["input"],
                    "answer": item["answer"],
                    "meta": item["meta"]
                }
                test_data.append(test_item)
    
    print(f"테스트 데이터 {len(test_data)}개 생성 완료")
    print(f"사용된 고유 GRI 인덱스: {len(used_gri_indices)}개")
    
    return test_data

def save_test_data(test_data: List[Dict], output_path: str):
    """테스트 데이터 저장"""
    with open(output_path, 'w', encoding='utf-8') as f:
        for item in test_data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    
    print(f"테스트 데이터가 {output_path}에 저장되었습니다.")

def create_evaluation_script(test_data: List[Dict], output_path: str):
    """모델 평가 스크립트 생성"""
    
    script_content = '''#!/usr/bin/env python3
"""
SLLM 모델 평가 스크립트
훈련된 모델의 성능을 테스트 데이터로 평가합니다.
"""

import json
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import re
from typing import List, Dict

def load_model_and_tokenizer(model_path: str):
    """훈련된 모델과 토크나이저 로드"""
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForCausalLM.from_pretrained(
        model_path,
        torch_dtype=torch.bfloat16,
        device_map="auto",
        trust_remote_code=True
    )
    return tokenizer, model

def extract_gri_index(text: str) -> str:
    """생성된 텍스트에서 GRI 인덱스 추출"""
    # GRI 인덱스 패턴 매칭 (예: 201-1, 301-3 등)
    pattern = r'\\b(\\d{3}-\\d+)\\b'
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
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
        
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
        format_correct = len(response) > 50 and "\\t" in response  # 표 형식 포함
        
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
    model_path = "./outputs/srlm-koalpaca-5.8b-qlora/merged"  # 병합된 모델 사용
    
    print("모델 로딩 중...")
    tokenizer, model = load_model_and_tokenizer(model_path)
    
    print("테스트 데이터 로딩 중...")
    with open("test_data.jsonl", "r", encoding="utf-8") as f:
        test_data = [json.loads(line) for line in f]
    
    print("모델 평가 시작...")
    results = evaluate_model(model, tokenizer, test_data)
    
    # 결과 출력
    print("\\n" + "="*50)
    print("평가 결과")
    print("="*50)
    print(f"총 테스트 수: {results['total']}")
    print(f"GRI 인덱스 정확도: {results['gri_accuracy']:.2%}")
    print(f"형식 정확도: {results['format_accuracy']:.2%}")
    print(f"전체 정확도: {results['overall_accuracy']:.2%}")
    print(f"\\n상세 결과:")
    
    for detail in results["details"]:
        print(f"테스트 {detail['test_id']}: {detail['expected_gri']} -> {detail['predicted_gri']} ({detail['score']})")
    
    # 결과 저장
    with open("evaluation_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print("\\n평가 결과가 evaluation_results.json에 저장되었습니다.")

if __name__ == "__main__":
    main()
'''
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    print(f"평가 스크립트가 {output_path}에 생성되었습니다.")

def main():
    # 시드 설정
    random.seed(42)
    
    # 훈련 데이터 로드
    training_data_path = "./data/gri_all.jsonl"
    if not os.path.exists(training_data_path):
        print(f"훈련 데이터 파일을 찾을 수 없습니다: {training_data_path}")
        return
    
    print("훈련 데이터 로딩 중...")
    training_data = load_training_data(training_data_path)
    
    # 테스트 데이터 생성
    print("테스트 데이터 생성 중...")
    test_data = create_test_data(training_data, num_test=40)
    
    # 테스트 데이터 저장
    test_data_path = "./test_data.jsonl"
    save_test_data(test_data, test_data_path)
    
    # 평가 스크립트 생성
    eval_script_path = "./evaluate_model.py"
    create_evaluation_script(test_data, eval_script_path)
    
    print("\\n" + "="*50)
    print("테스트 데이터 생성 완료!")
    print("="*50)
    print(f"1. 테스트 데이터: {test_data_path}")
    print(f"2. 평가 스크립트: {eval_script_path}")
    print("\\n사용법:")
    print("1. 테스트 데이터 확인: python -c \"import json; data=[json.loads(l) for l in open('test_data.jsonl')]; print(f'테스트 데이터 {len(data)}개')\"")
    print("2. 모델 평가 실행: python evaluate_model.py")

if __name__ == "__main__":
    main()
