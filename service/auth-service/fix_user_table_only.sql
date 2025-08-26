-- ========================================
-- User 테이블만 수정하는 간단한 스크립트
-- ========================================

-- 1. 현재 company_id 컬럼 타입 확인
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user' AND column_name = 'company_id';

-- 2. 외래키 제약조건이 없다면 추가
DO $$
BEGIN
    -- 외래키 제약조건이 이미 존재하는지 확인
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%corporation%'
    ) THEN
        -- 외래키 제약조건 추가
        ALTER TABLE "user" 
        ADD CONSTRAINT fk_user_corporation 
        FOREIGN KEY (company_id) REFERENCES corporation(id);
        
        RAISE NOTICE '외래키 제약조건이 추가되었습니다.';
    ELSE
        RAISE NOTICE '외래키 제약조건이 이미 존재합니다.';
    END IF;
END $$;

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS ix_user_company_id ON "user"(company_id);
CREATE INDEX IF NOT EXISTS ix_user_session_company ON "user"(auth_id, company_id);

-- 4. 기존 사용자들의 company_id 설정 (테헤온AI로 기본값)
UPDATE "user" 
SET company_id = (SELECT id FROM corporation WHERE name = '테헤온AI' LIMIT 1)
WHERE company_id IS NULL;

-- 5. 수정 결과 확인
SELECT 
    'user' as table_name,
    COUNT(*) as total_users,
    COUNT(company_id) as users_with_company
FROM "user";

-- 6. 외래키 제약조건 확인
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'user';
