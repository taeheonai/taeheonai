#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Database Constraints Adder for Railway Postgres

- Adds UNIQUE constraints to tables
- Required for ON CONFLICT operations
"""

import os
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql+psycopg2://postgres:ZtQKhXPQZLiyEgINSWDfRznAIcrJZhAx@gondola.proxy.rlwy.net:15963/railway"

def add_constraints():
    """데이터베이스에 필요한 제약조건들을 추가합니다."""
    engine = create_engine(DATABASE_URL)
    
    # 추가할 제약조건들
    constraints = [
        {
            "name": "esg_classification.esg UNIQUE",
            "sql": "ALTER TABLE esg_classification ADD CONSTRAINT uq_esg_classification_esg UNIQUE (esg);"
        },
        {
            "name": "materiality_category.category_name UNIQUE", 
            "sql": "ALTER TABLE materiality_category ADD CONSTRAINT uq_materiality_category_name UNIQUE (category_name);"
        },
        {
            "name": "issuepool_gri (category_id, gri_index) UNIQUE",
            "sql": "ALTER TABLE issuepool_gri ADD CONSTRAINT uq_issuepool_gri_category_gri UNIQUE (category_id, gri_index);"
        },
        {
            "name": "corporation.companyname UNIQUE",
            "sql": "ALTER TABLE corporation ADD CONSTRAINT uq_corporation_companyname UNIQUE (companyname);"
        },
        {
            "name": "corporation.stock_code UNIQUE",
            "sql": "ALTER TABLE corporation ADD CONSTRAINT uq_corporation_stock_code UNIQUE (stock_code);"
        }
    ]
    
    print("🔧 데이터베이스 제약조건 추가 시작...")
    
    with engine.begin() as conn:
        for constraint in constraints:
            try:
                conn.execute(text(constraint["sql"]))
                print(f"✅ {constraint['name']} 제약조건 추가 성공")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"⚠️ {constraint['name']} 제약조건이 이미 존재합니다")
                else:
                    print(f"❌ {constraint['name']} 제약조건 추가 실패: {e}")
    
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
                    AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
                    AND tc.table_name IN ('esg_classification', 'materiality_category', 'issuepool_gri', 'corporation')
                ORDER BY tc.table_name, tc.constraint_name;
            """))
            
            constraints_info = result.fetchall()
            if constraints_info:
                for row in constraints_info:
                    print(f"   ✅ {row[0]}.{row[3]} → {row[1]} ({row[2]})")
            else:
                print("   ⚠️ 제약조건이 없습니다")
                
    except Exception as e:
        print(f"   ❌ 제약조건 확인 중 오류: {e}")

if __name__ == "__main__":
    add_constraints()
