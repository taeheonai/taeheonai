#!/usr/bin/env python3
"""
JSON 파일 검증 스크립트
"""

import json
import sys

def validate_json_file(file_path):
    """JSON 파일을 검증합니다."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"✅ JSON 파일 '{file_path}' 검증 성공!")
        print(f"📊 데이터 구조: {type(data).__name__}")
        print(f"📝 항목 수: {len(data)}")
        return True
    except json.JSONDecodeError as e:
        print(f"❌ JSON 파싱 오류: {e}")
        print(f"📍 오류 위치: 라인 {e.lineno}, 컬럼 {e.colno}")
        return False
    except FileNotFoundError:
        print(f"❌ 파일을 찾을 수 없습니다: {file_path}")
        return False
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {e}")
        return False

def main():
    if len(sys.argv) != 2:
        print("사용법: python validate_json.py <json_file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    success = validate_json_file(file_path)
    
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()


