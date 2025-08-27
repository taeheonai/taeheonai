-- =====================================================
-- 데이터베이스 테이블 현황 확인
-- =====================================================

-- 1) 모든 테이블 목록 확인
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
ORDER BY table_schema, table_name;

-- 2) corporation 관련 테이블 확인
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name LIKE '%corp%' OR table_name LIKE '%company%'
ORDER BY table_schema, table_name;

-- 3) user 관련 테이블 확인
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name LIKE '%user%'
ORDER BY table_schema, table_name;

-- 4) corporation 테이블 구조 확인 (테이블이 존재한다면)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'corporation'
ORDER BY ordinal_position;

-- 5) user 테이블 구조 확인
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user'
ORDER BY ordinal_position;
