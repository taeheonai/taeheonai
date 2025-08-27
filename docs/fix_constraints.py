#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
누락된 제약조건을 추가하는 스크립트
"""

from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql+psycopg2://postgres:ZtQKhXPQZLiyEgINSWDfRznAIcrJZhAx@gondola.proxy.rlwy.net:15963/railway"

def add_missing_constraints():
    """누락된 제약조건을 추가합니다."""
    engine = create_engine(DATABASE_URL)
    
    print("🔧 누락된 제약조건 추가 시작...")
    
    with engine.begin() as conn:
        try:
            # issuepool_gri 테이블에 (category_id, gri_index) 복합 UNIQUE 제약조건 추가
            conn.execute(text("""
                ALTER TABLE issuepool_gri 
                ADD CONSTRAINT uq_issuepool_gri_category_gri 
                UNIQUE (category_id, gri_index);
            """))
            print("✅ issuepool_gri (category_id, gri_index) UNIQUE 제약조건 추가 성공")
            
        except Exception as e:
            if "already exists" in str(e).lower():
                print("⚠️ 제약조건이 이미 존재합니다")
            else:
                print(f"❌ 제약조건 추가 실패: {e}")
                return False
    
    print("\n📋 제약조건 추가 완료!")
    
    # 제약조건 확인
    print("\n🔍 현재 제약조건 상태 확인:")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT 
                    tc.table_name,
                    tc.constraint_name,
                    tc.constraint_type,
                    kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_schema = 'public' 
                    AND tc.table_name = 'issuepool_gri'
                ORDER BY tc.constraint_name;
            """))
            
            constraints_info = result.fetchall()
            if constraints_info:
                for row in constraints_info:
                    print(f"   ✅ {row[0]}.{row[3]} → {row[1]} ({row[2]})")
            else:
                print("   ⚠️ 제약조건이 없습니다")
                
    except Exception as e:
        print(f"   ❌ 제약조건 확인 중 오류: {e}")
    
    return True

if __name__ == "__main__":
    add_missing_constraints()
