#!/usr/bin/env python3
"""
grireport 테이블 제약 조건 수정 스크립트 (Railway 환경용)
"""

import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# .env 파일 로드 (있는 경우)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Railway 환경변수에서 데이터베이스 URL 가져오기
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL 환경변수가 설정되지 않았습니다.")
    print("💡 Railway 대시보드에서 직접 SQL을 실행하는 것을 권장합니다:")
    print("""
-- 1. updated_at 기본값 보장 + 과거 NULL 치유
ALTER TABLE grireport
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- 과거 NULL 데이터 치유
UPDATE grireport SET created_at = now() WHERE created_at IS NULL;
UPDATE grireport SET updated_at = now() WHERE updated_at IS NULL;

-- 2. NOT NULL 컬럼 수정
ALTER TABLE grireport ALTER COLUMN issuepool_id DROP NOT NULL;
ALTER TABLE grireport ALTER COLUMN esg_classification_id DROP NOT NULL;

-- 3. report_type 컬럼 추가
ALTER TABLE grireport ADD COLUMN IF NOT EXISTS report_type TEXT NOT NULL DEFAULT 'intake';

-- 4. 기존 데이터의 report_type 설정
UPDATE grireport SET report_type = 'intake' WHERE issuepool_id IS NULL;
UPDATE grireport SET report_type = 'materiality' WHERE issuepool_id IS NOT NULL;
    """)
    exit(1)

print(f"🔗 데이터베이스 연결: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'Unknown'}")

async def fix_db_constraints():
    """데이터베이스 제약 조건 수정"""
    engine = create_async_engine(DATABASE_URL)
    
    async with engine.begin() as conn:
        print("🚀 grireport 테이블 제약 조건 수정 시작...")
        
        try:
            # 1. updated_at 기본값 보장 + 과거 NULL 치유
            print("1️⃣ updated_at 기본값 설정 중...")
            await conn.execute(text("""
                ALTER TABLE grireport
                  ALTER COLUMN created_at SET DEFAULT now(),
                  ALTER COLUMN updated_at SET DEFAULT now()
            """))
            
            print("2️⃣ 과거 NULL 데이터 치유 중...")
            await conn.execute(text("""
                UPDATE grireport SET created_at = now() WHERE created_at IS NULL
            """))
            await conn.execute(text("""
                UPDATE grireport SET updated_at = now() WHERE updated_at IS NULL
            """))
            
            # 2. NOT NULL 컬럼 수정
            print("3️⃣ issuepool_id를 NULL 허용으로 변경 중...")
            await conn.execute(text("""
                ALTER TABLE grireport ALTER COLUMN issuepool_id DROP NOT NULL
            """))
            
            print("4️⃣ esg_classification_id를 NULL 허용으로 변경 중...")
            await conn.execute(text("""
                ALTER TABLE grireport ALTER COLUMN esg_classification_id DROP NOT NULL
            """))
            
            # 3. report_type 컬럼 추가
            print("5️⃣ report_type 컬럼 추가 중...")
            await conn.execute(text("""
                ALTER TABLE grireport ADD COLUMN IF NOT EXISTS report_type TEXT NOT NULL DEFAULT 'intake'
            """))
            
            # 4. 기존 데이터의 report_type 설정
            print("6️⃣ 기존 데이터 report_type 설정 중...")
            await conn.execute(text("""
                UPDATE grireport SET report_type = 'intake' WHERE issuepool_id IS NULL
            """))
            await conn.execute(text("""
                UPDATE grireport SET report_type = 'materiality' WHERE issuepool_id IS NOT NULL
            """))
            
            print("✅ 제약 조건 수정 완료!")
            
            # 5. 변경사항 확인
            print("\n📊 테이블 구조 확인:")
            result = await conn.execute(text("""
                SELECT 
                    column_name, 
                    is_nullable, 
                    data_type, 
                    column_default
                FROM information_schema.columns 
                WHERE table_name = 'grireport' 
                ORDER BY ordinal_position
            """))
            
            columns = result.fetchall()
            for col in columns:
                print(f"  {col[0]}: {col[1]} ({col[2]}) - 기본값: {col[3]}")
                
        except Exception as e:
            print(f"❌ 제약 조건 수정 실패: {e}")
            raise
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix_db_constraints())
