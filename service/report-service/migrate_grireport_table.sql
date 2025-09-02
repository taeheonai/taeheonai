-- grireport 테이블 마이그레이션 스크립트
-- 1. report_type 컬럼 추가
ALTER TABLE grireport ADD COLUMN IF NOT EXISTS report_type TEXT NOT NULL DEFAULT 'materiality';

-- 2. issuepool_id를 nullable로 변경
ALTER TABLE grireport ALTER COLUMN issuepool_id DROP NOT NULL;

-- 3. esg_classification_id를 nullable로 변경
ALTER TABLE grireport ALTER COLUMN esg_classification_id DROP NOT NULL;

-- 4. updated_at 컬럼에 기본값 설정 (INSERT 시 자동으로 현재 시간 설정)
ALTER TABLE grireport ALTER COLUMN updated_at SET DEFAULT NOW();

-- 5. 기존 데이터의 report_type을 'materiality'로 설정 (기본값)
UPDATE grireport SET report_type = 'materiality' WHERE report_type IS NULL;

-- 6. 기존 데이터 중 issuepool_id가 null인 경우 report_type을 'intake'로 설정
UPDATE grireport SET report_type = 'intake' WHERE issuepool_id IS NULL;

-- 7. 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_grireport_corporation_report_type ON grireport(corporation_id, report_type);
CREATE INDEX IF NOT EXISTS idx_grireport_report_type ON grireport(report_type);

-- 8. 변경사항 확인
SELECT 
    column_name, 
    is_nullable, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'grireport' 
ORDER BY ordinal_position;
