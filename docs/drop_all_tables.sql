-- =====================================================
-- Railway PostgreSQL 모든 테이블 삭제 스크립트
-- ⚠️ 주의: 이 스크립트는 모든 데이터를 삭제합니다!
-- 생성일: 2025-01-27
-- =====================================================

-- CASCADE로 모든 의존성 제거

DROP TABLE IF EXISTS media CASCADE;
DROP TABLE IF EXISTS company_report CASCADE;
DROP TABLE IF EXISTS issue_pool CASCADE;
DROP TABLE IF EXISTS profit CASCADE;
DROP TABLE IF EXISTS executive CASCADE;
DROP TABLE IF EXISTS finance CASCADE;
DROP TABLE IF EXISTS employee CASCADE;
DROP TABLE IF EXISTS survey_subject CASCADE;
DROP TABLE IF EXISTS survey_result CASCADE;
DROP TABLE IF EXISTS gri CASCADE;
DROP TABLE IF EXISTS gri_sr CASCADE;
DROP TABLE IF EXISTS corporation CASCADE;
DROP TABLE IF EXISTS tcfd CASCADE;
DROP TABLE IF EXISTS tcfd_sr CASCADE;

-- 인덱스도 함께 삭제됨 (CASCADE)

-- =====================================================
-- 삭제 완료 확인
-- =====================================================
-- 다음 쿼리로 테이블이 모두 삭제되었는지 확인:
/*
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;
*/
