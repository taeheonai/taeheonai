-- materiality.sql 파일을 UTF-8로 저장하고 한글 주석 제거
-- 또는 영문 주석으로 변경

-- 기존 테이블 삭제 (순서 중요: 자식 테이블부터 삭제)
DROP TABLE IF EXISTS issuepool_gri CASCADE;
DROP TABLE IF EXISTS issuepool CASCADE;
DROP TABLE IF EXISTS materiality_category CASCADE;
DROP TABLE IF EXISTS esg_classification CASCADE;

-- corporation 테이블이 존재하는지 확인하고, 없다면 생성
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'corporation') THEN
        CREATE TABLE corporation (
            id SERIAL PRIMARY KEY,
            corp_code TEXT NOT NULL UNIQUE,
            companyname TEXT NOT NULL UNIQUE,
            market TEXT,
            dart_code TEXT
        );
    END IF;
END $$;

-- corporation 테이블에 필요한 제약조건 추가 (이미 존재하면 무시)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'uq_corporation_companyname') THEN
        ALTER TABLE corporation ADD CONSTRAINT uq_corporation_companyname UNIQUE (companyname);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'uq_corporation_corp_code') THEN
        ALTER TABLE corporation ADD CONSTRAINT uq_corporation_corp_code UNIQUE (corp_code);
    END IF;
END $$;

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
-- 제약조건 추가 완료 확인
-- =====================================================
