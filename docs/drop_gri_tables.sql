-- 기존 GRI 테이블 삭제 스크립트
-- Railway PostgreSQL에서 실행하여 기존 테이블을 정리합니다.

-- 기존 테이블이 있다면 삭제
DROP TABLE IF EXISTS gri_answer CASCADE;
DROP TABLE IF EXISTS gri_question CASCADE;
DROP TABLE IF EXISTS gri_item CASCADE;
DROP TABLE IF EXISTS gri_category CASCADE;

-- 기존 타입 삭제
DROP TYPE IF EXISTS question_type CASCADE;

-- 기존 시퀀스 삭제 (있다면)
DROP SEQUENCE IF EXISTS gri_category_id_seq CASCADE;
DROP SEQUENCE IF EXISTS gri_item_id_seq CASCADE;
DROP SEQUENCE IF EXISTS gri_question_id_seq CASCADE;
DROP SEQUENCE IF EXISTS gri_answer_id_seq CASCADE;

-- 기존 뷰 삭제 (있다면)
DROP VIEW IF EXISTS gri_complete_view CASCADE;
DROP VIEW IF EXISTS gri_summary_view CASCADE;

-- 기존 함수 삭제 (있다면)
DROP FUNCTION IF EXISTS update_gri_item_display_order() CASCADE;
DROP FUNCTION IF EXISTS update_gri_question_display_order() CASCADE;

-- 기존 트리거 삭제 (있다면)
DROP TRIGGER IF EXISTS gri_item_display_order_trigger ON gri_item CASCADE;
DROP TRIGGER IF EXISTS gri_question_display_order_trigger ON gri_question CASCADE;

PRINT '✅ 기존 GRI 테이블 및 관련 객체들이 모두 삭제되었습니다.';
PRINT '이제 gri_input_fixed.sql을 실행하여 새로운 테이블을 생성하세요.';
