#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
데이터베이스 제약조건 확인 스크립트
"""

from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql+psycopg2://postgres:ZtQKhXPQZLiyEgINSWDfRznAIcrJZhAx@gondola.proxy.rlwy.net:15963/railway"

def check_constraints():
    """데이터베이스 제약조건을 확인합니다."""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # issuepool_gri 테이블의 제약조건 확인
        result = conn.execute(text("""
            SELECT 
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
        
        constraints = result.fetchall()
        print('🔍 issuepool_gri 테이블 제약조건:')
        for row in constraints:
            print(f'  ✅ {row[0]} ({row[1]}): {row[2]}')
        
        if not constraints:
            print('  ❌ 제약조건이 없습니다!')
        
        # 테이블 구조 확인
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public' 
                AND table_name = 'issuepool_gri'
            ORDER BY ordinal_position;
        """))
        
        print('\n📋 issuepool_gri 테이블 구조:')
        for row in result.fetchall():
            print(f'  {row[0]}: {row[1]} ({row[2]})')
        
        # materiality_category 테이블의 제약조건도 확인
        result = conn.execute(text("""
            SELECT 
                tc.constraint_name,
                tc.constraint_type,
                kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_schema = 'public' 
                AND tc.table_name = 'materiality_category'
            ORDER BY tc.constraint_name;
        """))
        
        constraints = result.fetchall()
        print('\n🔍 materiality_category 테이블 제약조건:')
        for row in constraints:
            print(f'  ✅ {row[0]} ({row[1]}): {row[2]}')

if __name__ == "__main__":
    check_constraints()
