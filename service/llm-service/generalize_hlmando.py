import json
import re

def generalize_company_names(input_file, output_file):
    """HL만도 데이터에서 기업명을 ABC로 일반화"""
    print(f"기업명 일반화 중: {input_file} → {output_file}")
    
    generalized_data = []
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print(f"총 {len(lines)}개 라인 처리 중...")
    
    # 기업명 매핑 (HL만도 → ABC)
    company_mappings = {
        'HL만도': 'ABC',
        'HL': 'ABC',
        'Mando': 'ABC'
    }
    
    for i, line in enumerate(lines):
        try:
            data = json.loads(line.strip())
            
            # instruction과 answer에서 기업명 교체
            if 'instruction' in data:
                for old_name, new_name in company_mappings.items():
                    data['instruction'] = data['instruction'].replace(old_name, new_name)
            
            if 'answer' in data:
                for old_name, new_name in company_mappings.items():
                    data['answer'] = data['answer'].replace(old_name, new_name)
            
            # meta.references에서도 교체
            if 'meta' in data and 'references' in data['meta']:
                for j, ref in enumerate(data['meta']['references']):
                    for old_name, new_name in company_mappings.items():
                        if old_name in ref:
                            data['meta']['references'][j] = ref.replace(old_name, new_name)
            
            generalized_data.append(data)
            
            if (i + 1) % 10 == 0:
                print(f"진행률: {i + 1}/{len(lines)}")
                
        except Exception as e:
            print(f"라인 {i + 1} 처리 실패: {e}")
            continue
    
    print(f"성공적으로 일반화된 데이터: {len(generalized_data)}개")
    
    # 일반화된 데이터 저장
    with open(output_file, 'w', encoding='utf-8') as f:
        for item in generalized_data:
            json.dump(item, f, ensure_ascii=False)
            f.write('\n')
    
    print(f"일반화 완료: {output_file}")
    return len(generalized_data)

def verify_generalization(file_path):
    """일반화 결과 검증"""
    print(f"\n일반화 결과 검증: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # HL만도가 남아있는지 확인
    hlmando_count = 0
    for i, line in enumerate(lines):
        if 'HL만도' in line or 'HL' in line or 'Mando' in line:
            hlmando_count += 1
            print(f"라인 {i + 1}: HL만도 관련 텍스트 발견")
    
    if hlmando_count == 0:
        print("✅ 모든 기업명이 성공적으로 일반화되었습니다!")
    else:
        print(f"⚠️ {hlmando_count}개 라인에 HL만도 관련 텍스트가 남아있습니다.")

if __name__ == "__main__":
    input_file = "data/hlmando_2024.jsonl"
    output_file = "data/hlmando_2024_generic.jsonl"
    
    try:
        count = generalize_company_names(input_file, output_file)
        print(f"\n✅ 완료! {count}개 데이터 일반화됨")
        print(f"일반화된 파일: {output_file}")
        
        # 검증
        verify_generalization(output_file)
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
