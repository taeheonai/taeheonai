-- =====================================================
-- 기존 user 테이블에 FK 제약조건 추가
-- =====================================================

-- 1) corporation 테이블이 존재하는지 확인
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'corporation'
    ) THEN
        RAISE EXCEPTION 'corporation 테이블이 존재하지 않습니다. corporation-service를 먼저 실행하세요.';
    END IF;
END $$;

-- 2) user 테이블이 존재하는지 확인
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user'
    ) THEN
        RAISE EXCEPTION 'user 테이블이 존재하지 않습니다.';
    END IF;
END $$;

-- 3) corporation_id 컬럼이 존재하는지 확인
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user' AND column_name = 'corporation_id'
    ) THEN
        RAISE EXCEPTION 'user.corporation_id 컬럼이 존재하지 않습니다.';
    END IF;
END $$;

-- 4) FK 제약조건 추가
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
        
        RAISE NOTICE 'FK 제약조건이 성공적으로 추가되었습니다.';
    ELSE
        RAISE NOTICE 'FK 제약조건이 이미 존재합니다.';
    END IF;
END $$;

-- 5) 인덱스 생성
CREATE INDEX IF NOT EXISTS ix_user_corporation_id ON "user"(corporation_id);
CREATE INDEX IF NOT EXISTS ix_corporation_corp_code ON corporation(corp_code);
