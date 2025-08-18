#!/usr/bin/env python3
"""
Railway PostgreSQL 데이터베이스 설정 스크립트
"""

import os
import asyncio
import asyncpg
from pathlib import Path

async def setup_database():
    """데이터베이스 설정"""
    
    # 환경 변수에서 데이터베이스 URL 가져오기
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.")
        print("Railway에서 DATABASE_URL을 확인하고 설정해주세요.")
        return
    
    try:
        # 데이터베이스 연결
        print("🔌 데이터베이스에 연결 중...")
        conn = await asyncpg.connect(database_url)
        
        # SQL 스크립트 파일 읽기
        script_path = Path("docs/create_database_with_varchar_dates.sql")
        
        if not script_path.exists():
            print(f"❌ SQL 스크립트 파일을 찾을 수 없습니다: {script_path}")
            return
        
        print("📖 SQL 스크립트 읽는 중...")
        with open(script_path, 'r', encoding='utf-8') as f:
            sql_script = f.read()
        
        # SQL 스크립트 실행
        print("🚀 데이터베이스 스키마 생성 중...")
        await conn.execute(sql_script)
        
        print("✅ 데이터베이스 설정이 완료되었습니다!")
        
        # 테이블 목록 확인
        print("\n📋 생성된 테이블 목록:")
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)
        
        for table in tables:
            print(f"  - {table['table_name']}")
        
        # 날짜 컬럼 타입 확인
        print("\n📅 날짜 컬럼 타입 확인:")
        date_columns = await conn.fetch("""
            SELECT 
                table_name,
                column_name,
                data_type
            FROM information_schema.columns 
            WHERE table_name IN ('media', 'executive', 'gri')
                AND column_name IN ('date', 'tenure_end_on')
            ORDER BY table_name, column_name
        """)
        
        for col in date_columns:
            print(f"  - {col['table_name']}.{col['column_name']}: {col['data_type']}")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ 데이터베이스 설정 중 오류 발생: {e}")
        print("\n🔧 문제 해결 방법:")
        print("1. DATABASE_URL이 올바른지 확인")
        print("2. Railway PostgreSQL 서비스가 실행 중인지 확인")
        print("3. 네트워크 연결 상태 확인")

if __name__ == "__main__":
    print("🚀 Railway PostgreSQL 데이터베이스 설정 시작")
    print("=" * 50)
    
    asyncio.run(setup_database())
    
    print("\n" + "=" * 50)
    print("✨ 설정 완료!")
