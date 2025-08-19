#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
현재 데이터베이스의 데이터 상태를 확인하는 스크립트
"""

import psycopg2

# Railway PostgreSQL 연결 설정
DB_CONFIG = {
    'host': 'gondola.proxy.rlwy.net',
    'port': '15963',
    'database': 'railway',
    'user': 'postgres',
    'password': 'ZtQKhXPQZLiyEgINSWDfRznAIcrJZhAx',
}

def check_data_status():
    """현재 데이터베이스의 데이터 상태 확인"""
    try:
        connection = psycopg2.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        print("🔍 데이터베이스 상태 확인 중...")
        print("=" * 50)
        
        # 1. gri_category 테이블 상태
        cursor.execute("SELECT COUNT(*) FROM gri_category")
        category_count = cursor.fetchone()[0]
        print(f"📊 gri_category: {category_count}개")
        
        if category_count > 0:
            cursor.execute("SELECT id, code, title FROM gri_category ORDER BY id")
            categories = cursor.fetchall()
            print("   📋 카테고리 목록:")
            for cat_id, code, title in categories:
                print(f"      ID {cat_id}: {code} - {title}")
        
        # 2. gri_item 테이블 상태
        cursor.execute("SELECT COUNT(*) FROM gri_item")
        item_count = cursor.fetchone()[0]
        print(f"\n📊 gri_item: {item_count}개")
        
        if item_count > 0:
            cursor.execute("""
                SELECT i.id, i.index_no, i.category_id, c.code, c.title
                FROM gri_item i
                LEFT JOIN gri_category c ON i.category_id = c.id
                ORDER BY i.id
                LIMIT 10
            """)
            items = cursor.fetchall()
            print("   📋 아이템 샘플 (상위 10개):")
            for item_id, index_no, category_id, cat_code, cat_title in items:
                if cat_code:
                    print(f"      ID {item_id}: {index_no} (카테고리: {cat_code} - {cat_title})")
                else:
                    print(f"      ID {item_id}: {index_no} (⚠️  카테고리 없음: {category_id})")
        
        # 3. gri_question 테이블 상태
        cursor.execute("SELECT COUNT(*) FROM gri_question")
        question_count = cursor.fetchone()[0]
        print(f"\n📊 gri_question: {question_count}개")
        
        cursor.close()
        connection.close()
        
        return True
        
    except Exception as e:
        print(f"❌ 상태 확인 실패: {e}")
        if 'connection' in locals():
            connection.close()
        return False

def main():
    """메인 실행 함수"""
    check_data_status()

if __name__ == "__main__":
    main()
