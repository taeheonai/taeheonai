#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
JSON 파일에서 category_id=34인 아이템을 확인하는 스크립트
"""

import json

def check_json_category():
    """JSON 파일에서 category_id=34인 아이템을 확인합니다."""
    
    # GRI_items_extracted_fixed.json 파일 읽기
    try:
        with open('GRI_items_extracted_fixed.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        items = data.get('items', [])
        print(f"📊 총 아이템 수: {len(items)}개")
        
        # category_id=34인 아이템 찾기
        category_34_items = [item for item in items if item.get('category_id') == 34]
        print(f"\n🔍 category_id=34인 아이템 수: {len(category_34_items)}개")
        
        if category_34_items:
            print("\n📋 category_id=34인 아이템 목록:")
            for item in category_34_items:
                print(f"  {item['index_no']}: {item['title']}")
        
        # 모든 category_id 값 확인
        category_ids = set(item.get('category_id') for item in items if item.get('category_id'))
        print(f"\n📊 사용된 category_id 값들: {sorted(category_ids)}")
        
        # category_id별 아이템 수
        print(f"\n📊 category_id별 아이템 수:")
        for cat_id in sorted(category_ids):
            count = len([item for item in items if item.get('category_id') == cat_id])
            print(f"  category_id {cat_id}: {count}개")
        
    except FileNotFoundError:
        print("❌ GRI_items_extracted_fixed.json 파일을 찾을 수 없습니다.")
    except Exception as e:
        print(f"❌ 파일 읽기 실패: {e}")

if __name__ == "__main__":
    check_json_category()
