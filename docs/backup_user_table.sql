-- =====================================================
-- user 테이블 데이터 백업 및 재생성
-- =====================================================

-- 1) 기존 user 테이블 데이터 백업
CREATE TABLE IF NOT EXISTS user_backup AS 
SELECT * FROM "user";

-- 2) 백업 데이터 확인
SELECT COUNT(*) as backup_count FROM user_backup;

-- 3) 기존 user 테이블 삭제
DROP TABLE IF EXISTS "user" CASCADE;

-- 4) corporation 테이블이 존재하는지 확인
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'corporation'
    ) THEN
        RAISE EXCEPTION 'corporation 테이블이 존재하지 않습니다. corporation-service를 먼저 실행하세요.';
    END IF;
END $$;

-- 5) user 테이블 재생성 (FK 포함)
CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    corporation_id INTEGER REFERENCES corporation(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    industry TEXT,
    email TEXT,
    name TEXT,
    birth TEXT,
    auth_id TEXT UNIQUE NOT NULL,
    auth_pw TEXT NOT NULL
);

-- 6) 인덱스 생성
CREATE INDEX ix_user_corporation_id ON "user"(corporation_id);
CREATE INDEX ix_user_auth_id ON "user"(auth_id);

-- 7) 백업 데이터 복원 (corporation_id가 유효한 경우만)
INSERT INTO "user" (corporation_id, industry, email, name, birth, auth_id, auth_pw)
SELECT 
    ub.corporation_id,
    ub.industry,
    ub.email,
    ub.name,
    ub.birth,
    ub.auth_id,
    ub.auth_pw
FROM user_backup ub
WHERE ub.corporation_id IS NULL 
   OR EXISTS (
       SELECT 1 FROM corporation c 
       WHERE c.id = ub.corporation_id
   );

-- 8) 복원된 데이터 확인
SELECT COUNT(*) as restored_count FROM "user";

-- 9) 백업 테이블 정리 (선택사항)
-- DROP TABLE user_backup;
