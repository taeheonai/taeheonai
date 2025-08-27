-- =====================================================
-- Railway PostgreSQL 제약조건 추가 스크립트
-- 생성일: 2025-01-27
-- =====================================================

-- 1. esg_classification 테이블에 esg 컬럼 UNIQUE 제약조건 추가
ALTER TABLE esg_classification 
ADD CONSTRAINT uq_esg_classification_esg UNIQUE (esg);

-- 2. materiality_category 테이블에 category_name 컬럼 UNIQUE 제약조건 추가
ALTER TABLE materiality_category 
ADD CONSTRAINT uq_materiality_category_name UNIQUE (category_name);

-- 3. issuepool_gri 테이블에 (category_id, gri_index) 복합 UNIQUE 제약조건 추가
ALTER TABLE issuepool_gri 
ADD CONSTRAINT uq_issuepool_gri_category_gri UNIQUE (category_id, gri_index);

-- 4. corporation 테이블에 companyname 컬럼 UNIQUE 제약조건 추가 (중복 회사명 방지)
ALTER TABLE corporation 
ADD CONSTRAINT uq_corporation_companyname UNIQUE (companyname);

-- 5. corporation 테이블에 stock_code 컬럼 UNIQUE 제약조건 추가 (중복 회사명 방지)
ALTER TABLE corporation 
ADD CONSTRAINT uq_corporation_stock_code UNIQUE (corp_code);

-- 5. 제약조건 추가 확인
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public' 
    AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
    AND tc.table_name IN ('esg_classification', 'materiality_category', 'issuepool_gri', 'corporation')
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- 제약조건 추가 완료 확인
-- =====================================================
