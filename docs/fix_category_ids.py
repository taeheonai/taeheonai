#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GRI_items_extracted.json의 category_id를 1부터 시작하도록 수정하는 스크립트
"""

import json

def fix_category_ids():
    """category_id를 1부터 시작하도록 수정"""
    
    print("🔧 category_id 수정 시작...")
    
    # 입력 파일 읽기
    input_file = "GRI_items_extracted.json"
    output_file = "GRI_items_extracted_fixed.json"
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        items = data.get('items', [])
        print(f"📊 총 {len(items)}개 아이템을 처리합니다...")
        
        # category_id 수정
        for item in items:
            current_id = item.get('category_id', 0)
            # 2→1, 3→2, 4→3, 5→4... 순서로 수정
            new_id = current_id - 1
            item['category_id'] = new_id
            
            if current_id != new_id:
                print(f"   수정: category_id {current_id} → {new_id}")
        
        # 수정된 데이터 저장
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"\n✅ category_id 수정 완료!")
        print(f"   출력 파일: {output_file}")
        
        # 샘플 데이터 확인
        if items:
            print(f"\n📋 수정된 샘플 데이터:")
            for i, item in enumerate(items[:5]):
                print(f"   {i+1}. index_no: {item['index_no']}, category_id: {item['category_id']}")
        
        return True
        
    except Exception as e:
        print(f"❌ 수정 실패: {e}")
        return False

def main():
    """메인 실행 함수"""
    print("🔄 GRI Items category_id 수정")
    print("=" * 50)
    
    if fix_category_ids():
        print("\n🎉 category_id 수정이 완료되었습니다!")
        print("💡 이제 python upload_items.py를 실행하세요.")
    else:
        print("❌ category_id 수정에 실패했습니다.")

if __name__ == "__main__":
    main()
