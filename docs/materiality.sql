-- materiality.sql 파일을 UTF-8로 저장하고 한글 주석 제거
-- 또는 영문 주석으로 변경
-- 기존 테이블 삭제
DROP TABLE IF EXISTS esg_classification CASCADE;
DROP TABLE IF EXISTS issuepool_gri CASCADE;
DROP TABLE IF EXISTS issuepool CASCADE;
DROP TABLE IF EXISTS materiality_category CASCADE;


-- 수정된 테이블 생성 (한글 주석 제거)
CREATE TABLE esg_classification (
    id SERIAL PRIMARY KEY,
    esg TEXT NOT NULL UNIQUE
);

CREATE TABLE materiality_category (
    id SERIAL PRIMARY KEY,
    category_name TEXT NOT NULL UNIQUE,
    esg_classification_id INTEGER REFERENCES esg_classification(id)
);

CREATE TABLE issuepool (
    id SERIAL PRIMARY KEY,
    corporation_id INTEGER REFERENCES corporation(id),
    publish_year TEXT,
    ranking TEXT,
    base_issue_pool TEXT,
    issue_pool TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES materiality_category(id),
    esg_classification_id INTEGER REFERENCES esg_classification(id)
);

CREATE TABLE issuepool_gri (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES materiality_category(id),
    gri_index TEXT NOT NULL,
    UNIQUE (category_id, gri_index)
);

-- =====================================================
-- 추가 제약조건들 (이미 존재하면 무시)
-- =====================================================

-- corporation 테이블에 companyname 컬럼 UNIQUE 제약조건 추가 (중복 회사명 방지)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'uq_corporation_companyname') THEN
        ALTER TABLE corporation ADD CONSTRAINT uq_corporation_companyname UNIQUE (companyname);
    END IF;
END $$;

-- corporation 테이블에 stock_code 컬럼 UNIQUE 제약조건 추가 (중복 회사명 방지)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'uq_corporation_stock_code') THEN
        ALTER TABLE corporation ADD CONSTRAINT uq_corporation_stock_code UNIQUE (corp_code);
    END IF;
END $$;

-- =====================================================
-- 제약조건 추가 완료 확인
-- =====================================================
