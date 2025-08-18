-- =====================================================
-- Database Migration Script
-- company_id를 INTEGER에서 VARCHAR(50)로 변경
-- NUMERIC과 INTEGER를 VARCHAR로 변경
-- 생성일: 2025-01-27
-- =====================================================

-- 1. user 테이블 마이그레이션
ALTER TABLE "user" ALTER COLUMN company_id TYPE VARCHAR(50);

-- 2. media 테이블 마이그레이션
ALTER TABLE media ALTER COLUMN company_id TYPE VARCHAR(50);

-- 3. company_report 테이블 마이그레이션
ALTER TABLE company_report ALTER COLUMN company_id TYPE VARCHAR(50);

-- 4. issue_pool 테이블 마이그레이션
ALTER TABLE issue_pool ALTER COLUMN company_id TYPE VARCHAR(50);
ALTER TABLE issue_pool ALTER COLUMN year TYPE VARCHAR(10);
ALTER TABLE issue_pool ALTER COLUMN score TYPE VARCHAR(20);



-- 5. survey_subject 테이블 마이그레이션
ALTER TABLE survey_subject ALTER COLUMN company_id TYPE VARCHAR(50);

-- 6. survey_result 테이블 마이그레이션
ALTER TABLE survey_result ALTER COLUMN company_id TYPE VARCHAR(50);
ALTER TABLE survey_result ALTER COLUMN weight TYPE VARCHAR(20);

-- 7. gri 테이블 마이그레이션
ALTER TABLE gri ALTER COLUMN company_id TYPE VARCHAR(50);
ALTER TABLE gri ALTER COLUMN gri_index TYPE VARCHAR(20);

-- 8. gri_sr 테이블 마이그레이션
ALTER TABLE gri_sr ALTER COLUMN company_id TYPE VARCHAR(50);
ALTER TABLE gri_sr ALTER COLUMN year TYPE VARCHAR(10);

-- 9. profit 테이블 마이그레이션
ALTER TABLE profit ALTER COLUMN fiscal_year_current TYPE VARCHAR(50);
ALTER TABLE profit ALTER COLUMN fiscal_year_previous TYPE VARCHAR(50);
ALTER TABLE profit ALTER COLUMN fiscal_year_before_last TYPE VARCHAR(50);

-- 10. finance 테이블 마이그레이션
ALTER TABLE finance ALTER COLUMN debt TYPE VARCHAR(50);
ALTER TABLE finance ALTER COLUMN debt_ratio TYPE VARCHAR(20);
ALTER TABLE finance ALTER COLUMN liability TYPE VARCHAR(50);
ALTER TABLE finance ALTER COLUMN netdebt TYPE VARCHAR(50);
ALTER TABLE finance ALTER COLUMN netdebt_ratio TYPE VARCHAR(20);
ALTER TABLE finance ALTER COLUMN capital_stock TYPE VARCHAR(50);
ALTER TABLE finance ALTER COLUMN equity TYPE VARCHAR(50);
ALTER TABLE finance ALTER COLUMN asset TYPE VARCHAR(50);
ALTER TABLE finance ALTER COLUMN long_term_debt TYPE VARCHAR(50);
ALTER TABLE finance ALTER COLUMN total_debt TYPE VARCHAR(50);
ALTER TABLE finance ALTER COLUMN cash TYPE VARCHAR(50);
ALTER TABLE finance ALTER COLUMN year TYPE VARCHAR(10);

-- 11. employee 테이블 마이그레이션
ALTER TABLE employee ALTER COLUMN fyer_salary_totamt TYPE VARCHAR(50);
ALTER TABLE employee ALTER COLUMN jan_salary_am TYPE VARCHAR(50);



-- =====================================================
-- 마이그레이션 완료 확인
-- =====================================================
-- 다음 쿼리로 변경사항을 확인할 수 있습니다:
/*
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE (column_name = 'company_id' OR data_type IN ('numeric', 'integer'))
    AND table_schema = 'public'
    AND table_name NOT LIKE '%_id'  -- id 컬럼 제외
ORDER BY table_name, column_name;
*/
