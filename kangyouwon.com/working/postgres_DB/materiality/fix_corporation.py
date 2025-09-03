import psycopg2

def fix_corporation_table():
    """corporation 테이블에 프라이머리 키 제약조건을 추가하는 함수"""
    
    # 데이터베이스 연결
    conn = psycopg2.connect(
        'postgresql://postgres:REDACTED_DB_PASSWORD_4@trolley.proxy.rlwy.net:52468/railway'
    )
    cur = conn.cursor()
    
    try:
        print("🔧 corporation 테이블 수정 중...\n")
        
        # 1. 현재 테이블 상태 확인
        print("📊 현재 테이블 상태:")
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'corporation' AND column_name = 'id'
        """)
        
        id_column = cur.fetchone()
        if id_column:
            col_name, data_type, nullable, default_val = id_column
            print(f"   id 컬럼: {data_type} (NULL: {nullable}, DEFAULT: {default_val})")
        
        # 2. 현재 제약조건 확인
        print("\n🔒 현재 제약조건:")
        cur.execute("""
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints 
            WHERE table_name = 'corporation'
        """)
        
        constraints = cur.fetchall()
        for constraint in constraints:
            name, type_ = constraint
            print(f"   {name}: {type_}")
        
        # 3. id 컬럼을 NOT NULL로 변경
        print("\n🔧 id 컬럼을 NOT NULL로 변경 중...")
        cur.execute("ALTER TABLE corporation ALTER COLUMN id SET NOT NULL")
        print("   ✅ id 컬럼을 NOT NULL로 변경 완료")
        
        # 4. 시퀀스가 존재하는지 확인하고, 없다면 생성
        print("🔧 시퀀스 확인 및 생성 중...")
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM pg_sequences 
                WHERE schemaname = 'public' AND sequencename = 'corporation_id_seq'
            )
        """)
        
        seq_exists = cur.fetchone()[0]
        if not seq_exists:
            print("   📝 corporation_id_seq 시퀀스가 존재하지 않습니다. 생성 중...")
            # 현재 테이블의 최대 id 값 찾기
            cur.execute("SELECT COALESCE(MAX(id), 0) FROM corporation")
            max_id = cur.fetchone()[0]
            
            # 시퀀스 생성
            cur.execute(f"""
                CREATE SEQUENCE corporation_id_seq 
                START WITH {max_id + 1}
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1
            """)
            print(f"   ✅ 시퀀스 생성 완료 (시작값: {max_id + 1})")
        else:
            print("   ✅ corporation_id_seq 시퀀스가 이미 존재합니다")
        
        # 5. id 컬럼에 시퀀스 기본값 추가
        print("🔧 id 컬럼에 시퀀스 기본값 추가 중...")
        cur.execute("ALTER TABLE corporation ALTER COLUMN id SET DEFAULT nextval('corporation_id_seq')")
        print("   ✅ 시퀀스 기본값 추가 완료")
        
        # 6. 프라이머리 키 제약조건 추가
        print("🔧 프라이머리 키 제약조건 추가 중...")
        cur.execute("ALTER TABLE corporation ADD CONSTRAINT pk_corporation_id PRIMARY KEY (id)")
        print("   ✅ 프라이머리 키 제약조건 추가 완료")
        
        # 7. 변경사항 확인
        print("\n📊 수정 후 테이블 상태:")
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'corporation' AND column_name = 'id'
        """)
        
        id_column = cur.fetchone()
        if id_column:
            col_name, data_type, nullable, default_val = id_column
            print(f"   id 컬럼: {data_type} (NULL: {nullable}, DEFAULT: {default_val})")
        
        print("\n🔒 수정 후 제약조건:")
        cur.execute("""
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints 
            WHERE table_name = 'corporation'
        """)
        
        constraints = cur.fetchall()
        for constraint in constraints:
            name, type_ = constraint
            print(f"   {name}: {type_}")
        
        # 변경사항 저장
        conn.commit()
        print("\n✅ 모든 수정사항이 성공적으로 적용되었습니다!")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        conn.rollback()
    
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    fix_corporation_table()
