-- =====================================================
-- 명명 규칙 통일 마이그레이션 스크립트
-- =====================================================

-- 1) 회사명 컬럼 스네이크 케이스로 변경
ALTER TABLE corporation RENAME COLUMN companyname TO company_name;

-- 2) FK 제약조건 보강 (이미 있으면 생략)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_user_corporation' 
        AND table_name = 'user'
    ) THEN
        ALTER TABLE "user"
        ADD CONSTRAINT fk_user_corporation
        FOREIGN KEY (corporation_id)
        REFERENCES corporation(id)
        ON UPDATE CASCADE ON DELETE RESTRICT;
    END IF;
END $$;

-- 3) 조회 성능용 인덱스 생성 (없으면 생성)
CREATE INDEX IF NOT EXISTS ix_user_corporation_id ON "user"(corporation_id);
CREATE INDEX IF NOT EXISTS ix_corporation_corp_code ON corporation(corp_code);

-- 4) 현재 스키마 확인
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('corporation', 'user')
ORDER BY table_name, ordinal_position;

-- 5) FK 관계 확인
SELECT 
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
    AND tc.table_name IN ('corporation', 'user');
