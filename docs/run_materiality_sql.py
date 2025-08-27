#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
materiality.sql 실행 스크립트
"""

from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql+psycopg2://postgres:ZtQKhXPQZLiyEgINSWDfRznAIcrJZhAx@gondola.proxy.rlwy.net:15963/railway"

def run_materiality_sql():
    """materiality.sql 파일을 실행합니다."""
    engine = create_engine(DATABASE_URL)
    
    print("🔄 materiality.sql 실행 중...")
    
    try:
        # SQL 파일 읽기
        with open('materiality.sql', 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # SQL 실행
        with engine.begin() as conn:
            conn.execute(text(sql_content))
        
        print("✅ materiality.sql 실행 완료")
        print("📋 테이블이 새로 생성되었습니다.")
        
    except Exception as e:
        print(f"❌ materiality.sql 실행 실패: {e}")
        return False
    
    return True

if __name__ == "__main__":
    run_materiality_sql()
