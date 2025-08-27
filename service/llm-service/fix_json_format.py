import ast
import json

def fix_json_format(input_file, output_file):
    """작은따옴표를 큰따옴표로 변경하여 표준 JSON 형식으로 변환"""
    print(f"데이터 형식 수정 중: {input_file} → {output_file}")
    
    fixed_data = []
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print(f"총 {len(lines)}개 라인 처리 중...")
    
    for i, line in enumerate(lines):
        try:
            # ast.literal_eval로 안전하게 파싱
            data = ast.literal_eval(line.strip())
            fixed_data.append(data)
            if (i + 1) % 10 == 0:
                print(f"진행률: {i + 1}/{len(lines)}")
        except Exception as e:
            print(f"라인 {i + 1} 파싱 실패: {e}")
            print(f"문제 라인: {line[:100]}...")
            continue
    
    print(f"성공적으로 파싱된 데이터: {len(fixed_data)}개")
    
    # JSON 형식으로 저장
    with open(output_file, 'w', encoding='utf-8') as f:
        for item in fixed_data:
            json.dump(item, f, ensure_ascii=False)
            f.write('\n')
    
    print(f"수정 완료: {output_file}")
    return len(fixed_data)

if __name__ == "__main__":
    input_file = "data/hanon_2024_gri_generic.jsonl"
    output_file = "data/hanon_2024_gri_fixed.jsonl"
    
    try:
        count = fix_json_format(input_file, output_file)
        print(f"\n✅ 완료! {count}개 데이터 형식 수정됨")
        print(f"수정된 파일: {output_file}")
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
