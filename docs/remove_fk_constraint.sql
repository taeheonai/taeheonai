-- =====================================================
-- 기존 FK 제약조건 제거
-- =====================================================

-- 1) 현재 FK 제약조건 확인
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'user';

-- 2) FK 제약조건 제거
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    -- user 테이블의 모든 FK 제약조건 찾기
    FOR constraint_name IN 
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'user' 
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE 'ALTER TABLE "user" DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'FK 제약조건 제거됨: %', constraint_name;
    END LOOP;
END $$;

-- 3) 제약조건 제거 확인
SELECT 
    tc.constraint_name,
    tc.table_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name = 'user';
