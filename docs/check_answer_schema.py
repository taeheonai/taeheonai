#!/usr/bin/env python3
"""
데이터베이스에서 gri_answer 테이블의 스키마를 확인하는 스크립트
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor

# Railway 데이터베이스 연결 정보
DB_CONFIG = {
    'host': 'gondola.proxy.rlwy.net',
    'port': 15963,
    'database': 'railway',
    'user': 'postgres',
    'password': 'your_password_here'  # 실제 비밀번호로 변경 필요
}

def check_answer_schema():
    """gri_answer 테이블의 스키마를 확인"""
    try:
        # 데이터베이스 연결
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("🔍 gri_answer 테이블 스키마 확인 중...")
        
        # 1. 테이블 존재 여부 확인
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'gri_answer'
            );
        """)
        table_exists = cursor.fetchone()['exists']
        
        if not table_exists:
            print("❌ gri_answer 테이블이 존재하지 않습니다.")
            return
        
        print("✅ gri_answer 테이블이 존재합니다.")
        
        # 2. 컬럼 정보 확인
        cursor.execute("""
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'gri_answer'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        print("\n📋 gri_answer 테이블 컬럼 정보:")
        print("-" * 60)
        for col in columns:
            print(f"  {col['column_name']:<20} {col['data_type']:<15} {'NULL' if col['is_nullable'] == 'YES' else 'NOT NULL'}")
            if col['column_default']:
                print(f"    기본값: {col['column_default']}")
        
        # 3. answer_json 컬럼 상세 확인
        cursor.execute("""
            SELECT 
                column_name,
                data_type,
                udt_name,
                character_maximum_length,
                numeric_precision,
                numeric_scale
            FROM information_schema.columns 
            WHERE table_name = 'gri_answer' AND column_name = 'answer_json';
        """)
        
        answer_json_col = cursor.fetchone()
        if answer_json_col:
            print(f"\n🎯 answer_json 컬럼 상세:")
            print(f"  데이터 타입: {answer_json_col['data_type']}")
            print(f"  UDT 이름: {answer_json_col['udt_name']}")
            print(f"  문자 최대 길이: {answer_json_col['character_maximum_length']}")
            print(f"  숫자 정밀도: {answer_json_col['numeric_precision']}")
            print(f"  숫자 스케일: {answer_json_col['numeric_scale']}")
        
        # 4. 제약조건 확인
        cursor.execute("""
            SELECT 
                constraint_name,
                constraint_type
            FROM information_schema.table_constraints 
            WHERE table_name = 'gri_answer';
        """)
        
        constraints = cursor.fetchall()
        if constraints:
            print(f"\n🔒 제약조건:")
            for constraint in constraints:
                print(f"  {constraint['constraint_name']}: {constraint['constraint_type']}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        print("Railway 데이터베이스 비밀번호를 확인하고 DB_CONFIG를 수정해주세요.")

if __name__ == "__main__":
    check_answer_schema()
