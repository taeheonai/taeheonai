#!/usr/bin/env python3
"""
Railway PostgreSQL 연결 테스트 스크립트
"""
import os
import psycopg2
from dotenv import load_dotenv

def test_railway_connection():
    """Railway PostgreSQL 연결을 테스트합니다."""
    
    # .env 파일 로드
    load_dotenv()
    
    # DATABASE_URL 가져오기
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("❌ DATABASE_URL 환경변수가 설정되지 않았습니다.")
        print("📝 env.example 파일을 참고하여 .env 파일을 생성하고 DATABASE_URL을 설정해주세요.")
        return False
    
    try:
        print(f"🔗 연결 시도: {database_url.split('@')[1] if '@' in database_url else 'Unknown'}")
        
        # 연결 테스트
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # 간단한 쿼리 실행
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        
        print(f"✅ 연결 성공!")
        print(f"📊 PostgreSQL 버전: {version[0]}")
        
        # 테이블 존재 여부 확인
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        
        tables = cursor.fetchall()
        if tables:
            print(f"📋 테이블 목록:")
            for table in tables:
                print(f"   - {table[0]}")
        else:
            print("📋 테이블이 없습니다.")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 연결 실패: {str(e)}")
        print("\n🔧 문제 해결 방법:")
        print("1. Railway에서 PostgreSQL 데이터베이스가 생성되었는지 확인")
        print("2. DATABASE_URL이 올바른지 확인")
        print("3. 네트워크 연결 상태 확인")
        return False

if __name__ == "__main__":
    print("🚀 Railway PostgreSQL 연결 테스트 시작")
    print("=" * 50)
    
    success = test_railway_connection()
    
    print("=" * 50)
    if success:
        print("🎉 모든 테스트가 성공했습니다!")
    else:
        print("�� 일부 테스트가 실패했습니다.")
