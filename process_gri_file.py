import json
import re

def process_gri_file(input_file, output_file):
    """GRI 파일의 input 값을 GRI 인덱스 번호로 대체합니다."""
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    processed_lines = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        try:
            # JSON 파싱
            data = json.loads(line)
            
            # instruction에서 GRI 번호 추출
            instruction = data.get('instruction', '')
            gri_match = re.search(r'GRI (\d{3}-\d+)', instruction)
            
            if gri_match:
                gri_number = gri_match.group(1)
                # input 값을 GRI 번호로 대체
                data['input'] = gri_number
                
            processed_lines.append(json.dumps(data, ensure_ascii=False))
            
        except json.JSONDecodeError as e:
            print(f"JSON 파싱 오류: {e}")
            processed_lines.append(line)
    
    # 결과 저장
    with open(output_file, 'w', encoding='utf-8') as f:
        for line in processed_lines:
            f.write(line + '\n')
    
    print(f"처리 완료: {len(processed_lines)}개 항목")
    print(f"결과 파일: {output_file}")

if __name__ == "__main__":
    input_file = r"c:\Users\bit\Downloads\gri_all.jsonl"
    output_file = r"c:\Users\bit\Downloads\gri_all_processed.jsonl"
    
    process_gri_file(input_file, output_file)
