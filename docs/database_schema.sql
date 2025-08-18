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
    industry VARCHAR(255),
    company_id VARCHAR(50),
    email VARCHAR(255),
    name VARCHAR(100),
    birth VARCHAR(20),
    auth_id VARCHAR(100),
    auth_pw VARCHAR(255)
);

-- 3. media 테이블
CREATE TABLE media (
    id SERIAL PRIMARY KEY,
    date DATE,
    keyword VARCHAR(255),
    company_id VARCHAR(50),
    industry VARCHAR(100),
    category VARCHAR(100)
);

-- 4. company_report 테이블
CREATE TABLE company_report (
    id SERIAL PRIMARY KEY,
    award VARCHAR(255),
    esg_targetguideline VARCHAR(1000),
    esg_action VARCHAR(1000),
    company_id VARCHAR(50)
);

-- 5. issue_pool 테이블
CREATE TABLE issue_pool (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(50),
    year VARCHAR(10),
    topic1 VARCHAR(500),
    topic2 VARCHAR(500),
    topic3 VARCHAR(500),
    topic4 VARCHAR(500),
    topic5 VARCHAR(500),
    topic6 VARCHAR(500),
    topic7 VARCHAR(500),
    topic8 VARCHAR(500),
    topic9 VARCHAR(500),
    topic10 VARCHAR(500),
    standard VARCHAR(100),
    industry VARCHAR(100),
    score VARCHAR(20)
);

-- 6. profit 테이블
CREATE TABLE profit (
    id SERIAL PRIMARY KEY,
    companyname VARCHAR(255),
    metric_name VARCHAR(100),
    fiscal_year_current VARCHAR(50),
    fiscal_year_previous VARCHAR(50),
    fiscal_year_before_last VARCHAR(50)
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



-- 8. finance 테이블
CREATE TABLE finance (
    id SERIAL PRIMARY KEY,
    companyname VARCHAR(255),
    debt VARCHAR(50),
    debt_ratio VARCHAR(20),
    liability VARCHAR(50),
    netdebt VARCHAR(50),
    netdebt_ratio VARCHAR(20),
    capital_stock VARCHAR(50),
    equity VARCHAR(50),
    asset VARCHAR(50),
    long_term_debt VARCHAR(50),
    total_debt VARCHAR(50),
    cash VARCHAR(50),
    year VARCHAR(10)
);

-- 9. employee 테이블 (기존 존재)
CREATE TABLE employee (
    id SERIAL PRIMARY KEY,
    corp_code VARCHAR(50),
    companyname VARCHAR(255),
    sexdstn VARCHAR(10),
    fo_bbm VARCHAR(100),
    rgllbr_co VARCHAR(100),
    rgllbr_abacpt_labrr_co VARCHAR(100),
    cnttk_co VARCHAR(100),
    cnttk_abacpt_labrr_co VARCHAR(100),
    sm VARCHAR(100),
    avrg_cnwk_sdytrn VARCHAR(100),
    fyer_salary_totamt VARCHAR(50),
    jan_salary_am VARCHAR(50)
);

-- 10. survey_subject 테이블
CREATE TABLE survey_subject (
    id SERIAL PRIMARY KEY,
    position VARCHAR(100),
    name VARCHAR(100),
    email VARCHAR(255),
    company_id VARCHAR(50),
    pw VARCHAR(255)
);

-- 11. survey_result 테이블
CREATE TABLE survey_result (
    id SERIAL PRIMARY KEY,
    question VARCHAR(1000),
    answer VARCHAR(1000),
    weight VARCHAR(20),
    company_id VARCHAR(50)
);

-- 12. gri 테이블
CREATE TABLE gri (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(50),
    date DATE,
    question VARCHAR(1000),
    answer VARCHAR(3000),
    gri_index VARCHAR(20)
);

-- 13. gri_sr 테이블
CREATE TABLE gri_sr (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR(50),
    year VARCHAR(10)
);

-- =====================================================
-- 인덱스 생성 (성능 향상)
-- =====================================================

-- 외래키 인덱스
CREATE INDEX idx_media_company_id ON media(company_id);
CREATE INDEX idx_issue_pool_company_id ON issue_pool(company_id);
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
-- ├── gri (company_id 참조)
-- ├── survey_subject (company_id 참조)
-- └── survey_result (company_id 참조)
--
-- corporation.companyname 참조
-- ├── profit
-- ├── executive
-- ├── finance
-- └── employee
-- =====================================================
