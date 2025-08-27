-- answer_json 컬럼을 JSONB에서 Text로 되돌리는 SQL 마이그레이션 스크립트
-- Railway 데이터베이스에서 실행

-- 1. 현재 컬럼 상태 확인
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'gri_answer' AND column_name = 'answer_json';

-- 2. 기존 데이터 백업 (선택사항)
-- 기존 데이터가 있다면 먼저 백업하세요
-- CREATE TABLE gri_answer_backup AS SELECT * FROM gri_answer;

-- 3. 컬럼 타입 변경
-- JSONB를 Text로 변경 (PostgreSQL에서 자동으로 처리)
ALTER TABLE gri_answer 
ALTER COLUMN answer_json TYPE TEXT;

-- 4. 변경 결과 확인
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'gri_answer' AND column_name = 'answer_json';

-- 5. Text 기능 테스트
-- 테스트 데이터 삽입
INSERT INTO gri_answer (question_id, session_key, answer_text, answer_json)
VALUES (999, 'test_session', 'Test answer', '{"test_key": "test_value", "nested": {"level1": "value1"}, "array": [1, 2, 3]}')
RETURNING id;

-- Text 데이터 조회 테스트
SELECT answer_json 
FROM gri_answer 
WHERE session_key = 'test_session';

-- 테스트 데이터 정리
DELETE FROM gri_answer WHERE session_key = 'test_session';

-- 6. 최종 확인
SELECT 
    'Migration completed successfully!' as status,
    'answer_json column is now TEXT type' as details;

