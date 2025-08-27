#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
gri_category 테이블 상태 확인 스크립트
"""

from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql+psycopg2://postgres:ZtQKhXPQZLiyEgINSWDfRznAIcrJZhAx@gondola.proxy.rlwy.net:15963/railway"

def check_gri_category():
    """gri_category 테이블의 상태를 확인합니다."""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # 전체 카테고리 수 확인
        result = conn.execute(text("SELECT COUNT(*) FROM gri_category"))
        total_count = result.fetchone()[0]
        print(f"📊 gri_category 테이블 총 카테고리 수: {total_count}개")
        
        # ID 범위 확인
        result = conn.execute(text("SELECT MIN(id), MAX(id) FROM gri_category"))
        min_id, max_id = result.fetchone()
        print(f"🔍 ID 범위: {min_id} ~ {max_id}")
        
        # 모든 카테고리 목록 (ID 순서대로)
        print(f"\n📋 모든 카테고리 목록 (ID 순서):")
        result = conn.execute(text("""
            SELECT id, code, title 
            FROM gri_category 
            ORDER BY id
        """))
        
        categories = result.fetchall()
        for cat in categories:
            print(f"  ID {cat[0]}: {cat[1]} - {cat[2]}")
        
        # gri_item 테이블에서 참조하는 category_id 확인
        print(f"\n🔍 gri_item 테이블에서 참조하는 category_id:")
        result = conn.execute(text("""
            SELECT DISTINCT category_id 
            FROM gri_item 
            ORDER BY category_id
        """))
        
        item_category_ids = result.fetchall()
        if item_category_ids:
            for row in item_category_ids:
                cat_id = row[0]
                # 해당 category_id가 gri_category에 존재하는지 확인
                result2 = conn.execute(text("SELECT code, title FROM gri_category WHERE id = :cat_id"), {"cat_id": cat_id})
                cat_info = result2.fetchone()
                if cat_info:
                    print(f"  ✅ category_id {cat_id}: {cat_info[0]} - {cat_info[1]}")
                else:
                    print(f"  ❌ category_id {cat_id}: gri_category에 존재하지 않음!")
        else:
            print("  gri_item 테이블에 데이터가 없습니다.")

if __name__ == "__main__":
    check_gri_category()
