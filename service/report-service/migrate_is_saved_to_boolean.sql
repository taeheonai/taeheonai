-- GRI Report Service: is_saved 컬럼을 Integer에서 Boolean으로 마이그레이션
-- 실행 전 백업 권장

BEGIN;

-- 기존 default 제거
ALTER TABLE grireport ALTER COLUMN is_saved DROP DEFAULT;

-- 정수(0/1)를 boolean으로 캐스팅
ALTER TABLE grireport
  ALTER COLUMN is_saved TYPE boolean
  USING (CASE WHEN is_saved = 1 THEN true ELSE false END);

-- NOT NULL + 기본값 설정
ALTER TABLE grireport
  ALTER COLUMN is_saved SET DEFAULT false,
  ALTER COLUMN is_saved SET NOT NULL;

COMMIT;

-- 마이그레이션 확인 쿼리
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'grireport' AND column_name = 'is_saved';
