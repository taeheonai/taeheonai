-- =====================================================
-- Railway PostgreSQL Database Schema
-- 생성일: 2025-08-14
-- =====================================================

-- 1. corporation 테이블 (중앙 테이블)
CREATE TABLE corporation (
    id SERIAL PRIMARY KEY,
    stock_code VARCHAR(50),
    companyname VARCHAR(255),
    market VARCHAR(100),
    dart_code VARCHAR(50)
);

-- 2. user 테이블 (기존 users에서 변경)
CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    industry TEXT,
    company_id INTEGER REFERENCES corporation(id),
    email TEXT,
    name TEXT,
    birth TEXT,
    auth_id TEXT,
    auth_pw TEXT
);

-- 3. media 테이블
CREATE TABLE media (
    id SERIAL PRIMARY KEY,
    date DATE,
    keyword VARCHAR(255),
    company_id INTEGER REFERENCES corporation(id),
    industry VARCHAR(100),
    category VARCHAR(100)
);

-- 4. company_report 테이블
CREATE TABLE company_report (
    id SERIAL PRIMARY KEY,
    award VARCHAR(255),
    esg_targetguideline TEXT,
    esg_action TEXT,
    company_id INTEGER REFERENCES corporation(id)
);

-- 5. issue_pool 테이블
CREATE TABLE issue_pool (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES corporation(id),
    year INTEGER,
    topic1 TEXT,
    topic2 TEXT,
    topic3 TEXT,
    topic4 TEXT,
    topic5 TEXT,
    topic6 TEXT,
    topic7 TEXT,
    topic8 TEXT,
    topic9 TEXT,
    topic10 TEXT,
    standard VARCHAR(100),
    industry VARCHAR(100),
    score NUMERIC(10,2)
);

-- 6. profit 테이블
CREATE TABLE profit (
    id SERIAL PRIMARY KEY,
    companyname VARCHAR(255),
    metric_name VARCHAR(100),
    fiscal_year_current NUMERIC(15,2),
    fiscal_year_previous NUMERIC(15,2),
    fiscal_year_before_last NUMERIC(15,2)
);

-- 7. executive 테이블
CREATE TABLE executive (
    id SERIAL PRIMARY KEY,
    corp_code VARCHAR(50),
    companyname VARCHAR(255),
    nm VARCHAR(100),
    sexdstn VARCHAR(10),
    birth_ym VARCHAR(8),
    ofcps VARCHAR(100),
    rgist_exctv_at VARCHAR(20),
    fte_at VARCHAR(20),
    chrg_job VARCHAR(100),
    main_career TEXT,
    mxmm_shrholdr_relate VARCHAR(100),
    hffc_pd VARCHAR(100),
    tenure_end_on DATE
);

-- 8. tcfd_sr 테이블
CREATE TABLE tcfd_sr (
    id SERIAL PRIMARY KEY,
    companyname VARCHAR(255),
    year INTEGER
);

-- 9. tcfd 테이블
CREATE TABLE tcfd (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES corporation(id),
    date DATE,
    question TEXT,
    answer TEXT,
    tcfd_index NUMERIC(10,2)
);

-- 10. finance 테이블
CREATE TABLE finance (
    id SERIAL PRIMARY KEY,
    companyname VARCHAR(255),
    debt NUMERIC(15,2),
    debt_ratio NUMERIC(10,2),
    liability NUMERIC(15,2),
    netdebt NUMERIC(15,2),
    netdebt_ratio NUMERIC(10,2),
    capital_stock NUMERIC(15,2),
    equity NUMERIC(15,2),
    asset NUMERIC(15,2),
    long_term_debt NUMERIC(15,2),
    total_debt NUMERIC(15,2),
    cash NUMERIC(15,2),
    year INTEGER
);

-- 11. employee 테이블 (기존 존재)
-- CREATE TABLE employee (
--     id SERIAL PRIMARY KEY,
--     corp_code VARCHAR(50),
--     companyname VARCHAR(255),
--     sexdstn VARCHAR(10),
--     fo_bbm VARCHAR(100),
--     rgllbr_co VARCHAR(100),
--     rgllbr_abacpt_labrr_co VARCHAR(100),
--     cnttk_co VARCHAR(100),
--     cnttk_abacpt_labrr_co VARCHAR(100),
--     sm VARCHAR(100),
--     avrg_cnwk_sdytrn VARCHAR(100),
--     fyer_salary_totamt NUMERIC(15,2),
--     jan_salary_am NUMERIC(15,2)
-- );

-- 12. survey_subject 테이블
CREATE TABLE survey_subject (
    id SERIAL PRIMARY KEY,
    position VARCHAR(100),
    name VARCHAR(100),
    email VARCHAR(255),
    company_id INTEGER REFERENCES corporation(id),
    pw VARCHAR(255)
);

-- 13. survey_result 테이블
CREATE TABLE survey_result (
    id SERIAL PRIMARY KEY,
    question TEXT,
    answer TEXT,
    weight NUMERIC(5,2),
    company_id INTEGER REFERENCES corporation(id)
);

-- 14. gri 테이블
CREATE TABLE gri (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES corporation(id),
    date DATE,
    question TEXT,
    answer TEXT,
    gri_index NUMERIC(10,2)
);

-- 15. gri_sr 테이블
CREATE TABLE gri_sr (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES corporation(id),
    year INTEGER
);

-- =====================================================
-- 인덱스 생성 (성능 향상)
-- =====================================================

-- 외래키 인덱스
CREATE INDEX idx_media_company_id ON media(company_id);
CREATE INDEX idx_issue_pool_company_id ON issue_pool(company_id);
CREATE INDEX idx_tcfd_company_id ON tcfd(company_id);
CREATE INDEX idx_gri_company_id ON gri(company_id);
CREATE INDEX idx_survey_subject_company_id ON survey_subject(company_id);
CREATE INDEX idx_survey_result_company_id ON survey_result(company_id);
CREATE INDEX idx_gri_sr_company_id ON gri_sr(company_id);

-- =====================================================
-- 테이블 관계도
-- =====================================================
-- corporation (중앙 테이블)
-- ├── user (company_id 참조)
-- ├── media (company_id 참조)
-- ├── company_report (company_id 참조)
-- ├── issue_pool (company_id 참조)
-- ├── tcfd (company_id 참조)
-- ├── gri (company_id 참조)
-- ├── survey_subject (company_id 참조)
-- └── survey_result (company_id 참조)
--
-- corporation.companyname 참조
-- ├── profit
-- ├── executive
-- ├── tcfd_sr
-- ├── finance
-- └── employee
-- =====================================================
