#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
기존 GRI 테이블을 삭제하고 재생성하는 스크립트
"""

import psycopg2
import os

# Railway PostgreSQL 연결 설정
DB_CONFIG = {
    'host': 'gondola.proxy.rlwy.net',
    'port': '15963',
    'database': 'railway',
    'user': 'postgres',
    'password': 'ZtQKhXPQZLiyEgINSWDfRznAIcrJZhAx',
}

def drop_existing_tables():
    """기존 GRI 테이블들을 모두 삭제"""
    try:
        connection = psycopg2.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        print("🗑️  기존 GRI 테이블 삭제 시작...")
        
        # 삭제 순서: 외래키 의존성을 고려하여 역순으로 삭제
        drop_queries = [
            "DROP TABLE IF EXISTS gri_answer CASCADE;",
            "DROP TABLE IF EXISTS gri_question CASCADE;",
            "DROP TABLE IF EXISTS gri_item CASCADE;",
            "DROP TABLE IF EXISTS gri_category CASCADE;",
            "DROP TYPE IF EXISTS question_type CASCADE;"
        ]
        
        for query in drop_queries:
            cursor.execute(query)
            print(f"   ✅ {query.strip()}")
        
        connection.commit()
        print("✅ 모든 GRI 테이블이 삭제되었습니다!")
        
        cursor.close()
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ 테이블 삭제 실패: {e}")
        if 'connection' in locals():
            connection.rollback()
            connection.close()
        return False

def create_new_tables():
    """gri_input_fixed.sql을 실행하여 새 테이블 생성"""
    try:
        connection = psycopg2.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        print("\n🏗️  새 GRI 테이블 생성 시작...")
        
        # SQL 파일 읽기
        sql_file = "gri_input_fixed.sql"
        if not os.path.exists(sql_file):
            print(f"❌ {sql_file} 파일을 찾을 수 없습니다!")
            return False
        
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # SQL 실행
        cursor.execute(sql_content)
        connection.commit()
        
        print("✅ 새 GRI 테이블이 생성되었습니다!")
        
        # 생성된 테이블 확인
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'gri%'
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        print(f"\n📋 생성된 테이블들:")
        for table in tables:
            print(f"   - {table[0]}")
        
        cursor.close()
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ 테이블 생성 실패: {e}")
        if 'connection' in locals():
            connection.rollback()
            connection.close()
        return False

def main():
    """메인 실행 함수"""
    print("🔄 GRI 테이블 삭제 및 재생성 시작!")
    print("=" * 60)
    
    # 1단계: 기존 테이블 삭제
    if not drop_existing_tables():
        print("❌ 테이블 삭제 실패로 종료합니다.")
        return
    
    # 2단계: 새 테이블 생성
    if not create_new_tables():
        print("❌ 테이블 생성 실패로 종료합니다.")
        return
    
    print("\n🎉 모든 작업이 완료되었습니다!")
    print("\n💡 다음 단계:")
    print("   1. python upload_categories.py 실행")
    print("   2. python upload_items.py 실행")
    print("   3. python upload_questions.py 실행")

if __name__ == "__main__":
    main()
