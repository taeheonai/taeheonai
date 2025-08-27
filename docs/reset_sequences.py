#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
데이터베이스 시퀀스 리셋 스크립트
"""

from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql+psycopg2://postgres:ZtQKhXPQZLiyEgINSWDfRznAIcrJZhAx@gondola.proxy.rlwy.net:15963/railway"

def reset_sequences():
    """데이터베이스 시퀀스를 1부터 다시 시작하도록 리셋합니다."""
    engine = create_engine(DATABASE_URL)
    
    print("🔄 데이터베이스 시퀀스 리셋 시작...")
    
    with engine.begin() as conn:
        try:
            # 시퀀스 리셋
            print("🔧 시퀀스 리셋 중...")
            
            # esg_classification_id_seq 리셋
            conn.execute(text("ALTER SEQUENCE esg_classification_id_seq RESTART WITH 1;"))
            print("✅ esg_classification_id_seq 리셋 완료")
            
            # materiality_category_id_seq 리셋
            conn.execute(text("ALTER SEQUENCE materiality_category_id_seq RESTART WITH 1;"))
            print("✅ materiality_category_id_seq 리셋 완료")
            
            # issuepool_id_seq 리셋
            conn.execute(text("ALTER SEQUENCE issuepool_id_seq RESTART WITH 1;"))
            print("✅ issuepool_id_seq 리셋 완료")
            
            # issuepool_gri_id_seq 리셋
            conn.execute(text("ALTER SEQUENCE issuepool_gri_id_seq RESTART WITH 1;"))
            print("✅ issuepool_gri_id_seq 리셋 완료")
            
        except Exception as e:
            print(f"❌ 시퀀스 리셋 실패: {e}")
            return False
    
    print("\n📋 시퀀스 리셋 완료!")
    return True

if __name__ == "__main__":
    reset_sequences()
