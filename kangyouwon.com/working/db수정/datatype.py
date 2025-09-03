#!/usr/bin/env python3
"""
PostgreSQL 데이터베이스의 모든 테이블에서 primary key를 제외한 모든 컬럼의 데이터 타입을 text로 변경
"""

import os
import asyncio
import asyncpg
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

async def get_all_tables_and_columns(conn):
    """모든 테이블과 컬럼 정보 조회 (primary key 제외)"""
    
    query = """
    SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        CASE 
            WHEN pk.column_name IS NOT NULL THEN true 
            ELSE false 
        END as is_primary_key
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    LEFT JOIN (
        SELECT 
            tc.table_name, 
            kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
    ) pk ON t.table_name = pk.table_name AND c.column_name = pk.column_name
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type != 'text'  -- 이미 text인 컬럼 제외
    ORDER BY t.table_name, c.ordinal_position;
    """
    
    return await conn.fetch(query)

async def alter_column_to_text(conn, table_name, column_name, current_type):
    """컬럼 데이터 타입을 text로 변경"""
    
    try:
        # ALTER TABLE 명령 실행
        alter_query = f"""
        ALTER TABLE "{table_name}" 
        ALTER COLUMN "{column_name}" TYPE text;
        """
        
        await conn.execute(alter_query)
        return True, None
        
    except Exception as e:
        return False, str(e)

async def convert_all_columns_to_text():
    """모든 테이블의 컬럼을 text 타입으로 변경"""
    
    DATABASE_URL = os.getenv('DATABASE_URL')
    
    if not DATABASE_URL:
        print("❌ DATABASE_URL 환경변수가 설정되지 않았습니다.")
        return
    
    try:
        # 데이터베이스 연결
        print("🔌 데이터베이스에 연결 중...")
        conn = await asyncpg.connect(DATABASE_URL)
        
        print("✅ 데이터베이스 연결 성공!")
        
        # 모든 테이블과 컬럼 정보 조회
        print("🔍 테이블과 컬럼 정보 조회 중...")
        columns = await get_all_tables_and_columns(conn)
        
        if not columns:
            print("✅ 변경할 컬럼이 없습니다. 모든 컬럼이 이미 text 타입입니다.")
            await conn.close()
            return
        
        print(f"\n📊 총 {len(columns)}개의 컬럼을 text 타입으로 변경합니다.")
        print("=" * 80)
        
        # 변경 전 요약 출력
        table_summary = {}
        for col in columns:
            table_name = col['table_name']
            if table_name not in table_summary:
                table_summary[table_name] = []
            table_summary[table_name].append({
                'column': col['column_name'],
                'current_type': col['data_type'],
                'is_primary': col['is_primary_key']
            })
        
        print("📋 변경 대상 테이블 및 컬럼:")
        for table_name, cols in table_summary.items():
            print(f"\n🏷️  테이블: {table_name}")
            for col in cols:
                if not col['is_primary']:
                    print(f"   - {col['column']}: {col['current_type']} → text")
                else:
                    print(f"   - {col['column']}: {col['current_type']} (PRIMARY KEY - 변경 제외)")
        
        print("\n" + "=" * 80)
        
        # 사용자 확인
        confirm = input("\n⚠️  이 작업은 되돌릴 수 없습니다. 계속하시겠습니까? (yes/no): ")
        if confirm.lower() != 'yes':
            print("❌ 작업이 취소되었습니다.")
            await conn.close()
            return
        
        # 컬럼 변경 실행
        print("\n🚀 컬럼 데이터 타입 변경 시작...")
        success_count = 0
        error_count = 0
        errors = []
        
        for col in columns:
            table_name = col['table_name']
            column_name = col['column_name']
            current_type = col['data_type']
            is_primary = col['is_primary_key']
            
            # Primary key는 건너뛰기
            if is_primary:
                print(f"⏭️  {table_name}.{column_name} (PRIMARY KEY - 건너뜀)")
                continue
            
            print(f"🔄 {table_name}.{column_name}: {current_type} → text")
            
            success, error = await alter_column_to_text(conn, table_name, column_name, current_type)
            
            if success:
                print(f"✅ {table_name}.{column_name} 변경 완료")
                success_count += 1
            else:
                print(f"❌ {table_name}.{column_name} 변경 실패: {error}")
                error_count += 1
                errors.append({
                    'table': table_name,
                    'column': column_name,
                    'error': error
                })
        
        # 결과 요약
        print("\n" + "=" * 80)
        print("📊 변경 결과 요약:")
        print(f"✅ 성공: {success_count}개")
        print(f"❌ 실패: {error_count}개")
        
        if errors:
            print("\n❌ 실패한 컬럼들:")
            for error in errors:
                print(f"   - {error['table']}.{error['column']}: {error['error']}")
        
        # 연결 종료
        await conn.close()
        print("\n✅ 데이터베이스 연결 종료")
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        print(f"상세 오류: {type(e).__name__}")

async def preview_changes():
    """변경될 내용 미리보기 (실제 변경하지 않음)"""
    
    DATABASE_URL = os.getenv('DATABASE_URL')
    
    if not DATABASE_URL:
        print("❌ DATABASE_URL 환경변수가 설정되지 않았습니다.")
        return
    
    try:
        # 데이터베이스 연결
        print("🔌 데이터베이스에 연결 중...")
        conn = await asyncpg.connect(DATABASE_URL)
        
        print("✅ 데이터베이스 연결 성공!")
        
        # 모든 테이블과 컬럼 정보 조회
        print("🔍 테이블과 컬럼 정보 조회 중...")
        columns = await get_all_tables_and_columns(conn)
        
        if not columns:
            print("✅ 변경할 컬럼이 없습니다. 모든 컬럼이 이미 text 타입입니다.")
            await conn.close()
            return
        
        print(f"\n📊 총 {len(columns)}개의 컬럼이 text 타입으로 변경됩니다.")
        print("=" * 80)
        
        # 테이블별로 그룹화하여 출력
        table_summary = {}
        for col in columns:
            table_name = col['table_name']
            if table_name not in table_summary:
                table_summary[table_name] = []
            table_summary[table_name].append({
                'column': col['column_name'],
                'current_type': col['data_type'],
                'is_primary': col['is_primary_key']
            })
        
        for table_name, cols in sorted(table_summary.items()):
            print(f"\n🏷️  테이블: {table_name}")
            for col in cols:
                if not col['is_primary']:
                    print(f"   - {col['column']}: {col['current_type']} → text")
                else:
                    print(f"   - {col['column']}: {col['current_type']} (PRIMARY KEY - 변경 제외)")
        
        # 연결 종료
        await conn.close()
        print("\n✅ 데이터베이스 연결 종료")
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        print(f"상세 오류: {type(e).__name__}")
        try:
            await conn.close()
        except:
            pass

async def main():
    """메인 함수"""
    print("🚀 PostgreSQL 컬럼 데이터 타입 변경 도구")
    print("=" * 60)
    
    while True:
        print("\n📋 메뉴 선택:")
        print("1. 변경될 내용 미리보기")
        print("2. 실제 변경 실행")
        print("3. 종료")
        
        choice = input("\n선택하세요 (1-3): ").strip()
        
        if choice == '1':
            print("\n🔍 변경될 내용 미리보기...")
            await preview_changes()
            
        elif choice == '2':
            print("\n⚠️  실제 변경을 실행합니다...")
            await convert_all_columns_to_text()
            
        elif choice == '3':
            print("👋 프로그램을 종료합니다.")
            break
            
        else:
            print("❌ 잘못된 선택입니다. 1-3 중에서 선택해주세요.")

if __name__ == "__main__":
    # asyncio 이벤트 루프 실행
    asyncio.run(main())
