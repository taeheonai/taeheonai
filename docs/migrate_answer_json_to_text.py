#!/usr/bin/env python3
"""
answer_json 컬럼을 JSONB에서 Text로 되돌리는 마이그레이션 스크립트
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json

# Railway 데이터베이스 연결 정보
DB_CONFIG = {
    'host': 'gondola.proxy.rlwy.net',
    'port': 15963,
    'database': 'railway',
    'user': 'postgres',
    'password': 'your_password_here'  # 실제 비밀번호로 변경 필요
}

def migrate_answer_json_to_text():
    """answer_json 컬럼을 JSONB에서 Text로 변경"""
    conn = None
    try:
        # 데이터베이스 연결
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("🔄 answer_json 컬럼을 Text로 마이그레이션 시작...")
        
        # 1. 현재 컬럼 타입 확인
        cursor.execute("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'gri_answer' AND column_name = 'answer_json';
        """)
        
        result = cursor.fetchone()
        if not result:
            print("❌ answer_json 컬럼을 찾을 수 없습니다.")
            return
        
        current_type = result['data_type']
        print(f"📋 현재 answer_json 컬럼 타입: {current_type}")
        
        if current_type == 'text':
            print("✅ 이미 Text 타입입니다. 마이그레이션이 필요하지 않습니다.")
            return
        
        # 2. 기존 데이터 백업
        print("💾 기존 데이터 백업 중...")
        cursor.execute("SELECT id, answer_json FROM gri_answer WHERE answer_json IS NOT NULL")
        existing_data = cursor.fetchall()
        
        if existing_data:
            print(f"📊 백업할 데이터: {len(existing_data)}개 행")
            # 백업 파일 생성
            backup_file = "answer_json_backup.json"
            with open(backup_file, 'w', encoding='utf-8') as f:
                backup_data = []
                for row in existing_data:
                    backup_data.append({
                        'id': row['id'],
                        'answer_json': row['answer_json']
                    })
                json.dump(backup_data, f, ensure_ascii=False, indent=2)
            print(f"💾 백업 완료: {backup_file}")
        
        # 3. 컬럼 타입 변경
        print("🔄 컬럼 타입을 Text로 변경 중...")
        
        # JSONB를 Text로 변경 (PostgreSQL에서 자동으로 처리)
        cursor.execute("""
            ALTER TABLE gri_answer 
            ALTER COLUMN answer_json TYPE TEXT;
        """)
        
        print("✅ 컬럼 타입 변경 완료!")
        
        # 4. 변경 결과 확인
        cursor.execute("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'gri_answer' AND column_name = 'answer_json';
        """)
        
        result = cursor.fetchone()
        new_type = result['data_type']
        print(f"📋 변경 후 answer_json 컬럼 타입: {new_type}")
        
        if new_type == 'text':
            print("🎉 마이그레이션 성공!")
        else:
            print("❌ 마이그레이션 실패!")
        
        # 5. 테이블 정보 확인
        cursor.execute("""
            SELECT 
                column_name,
                data_type,
                is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'gri_answer' AND column_name = 'answer_json';
        """)
        
        column_info = cursor.fetchone()
        print(f"\n📋 최종 컬럼 정보:")
        print(f"  컬럼명: {column_info['column_name']}")
        print(f"  데이터 타입: {column_info['data_type']}")
        print(f"  NULL 허용: {column_info['is_nullable']}")
        
        # 변경사항 커밋
        conn.commit()
        print("💾 변경사항이 데이터베이스에 저장되었습니다.")
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ 마이그레이션 실패: {e}")
        print("🔍 오류 상세 정보:")
        import traceback
        traceback.print_exc()
    
    finally:
        if conn:
            conn.close()

def test_text_functionality():
    """Text 기능 테스트"""
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("\n🧪 Text 기능 테스트 중...")
        
        # 테스트 데이터 삽입
        test_data = json.dumps({
            "test_key": "test_value",
            "nested": {"level1": "value1"},
            "array": [1, 2, 3]
        })
        
        cursor.execute("""
            INSERT INTO gri_answer (question_id, session_key, answer_text, answer_json)
            VALUES (999, 'test_session', 'Test answer', %s)
            RETURNING id;
        """, (test_data,))
        
        test_id = cursor.fetchone()[0]
        print(f"✅ 테스트 데이터 삽입 성공 (ID: {test_id})")
        
        # Text 쿼리 테스트
        cursor.execute("""
            SELECT answer_json 
            FROM gri_answer WHERE id = %s;
        """, (test_id,))
        
        result = cursor.fetchone()
        if result[0]:
            parsed_data = json.loads(result[0])
            print(f"📊 Text 데이터 파싱 테스트 결과:")
            print(f"  test_key 값: {parsed_data.get('test_key')}")
            print(f"  nested.level1 값: {parsed_data.get('nested', {}).get('level1')}")
            print(f"  array 값: {parsed_data.get('array')}")
        
        # 테스트 데이터 정리
        cursor.execute("DELETE FROM gri_answer WHERE id = %s", (test_id,))
        print("🧹 테스트 데이터 정리 완료")
        
        conn.commit()
        print("✅ Text 기능 테스트 성공!")
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ Text 기능 테스트 실패: {e}")
    
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("🔄 answer_json 컬럼 Text 마이그레이션 도구")
    print("=" * 60)
    
    # 1. 마이그레이션 실행
    migrate_answer_json_to_text()
    
    # 2. Text 기능 테스트
    test_text_functionality()
    
    print("\n" + "=" * 60)
    print("🎯 마이그레이션 완료!")
    print("이제 GRI 서비스가 정상 작동할 것입니다.")
    print("=" * 60)
