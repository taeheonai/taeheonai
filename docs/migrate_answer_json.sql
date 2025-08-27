-- answer_json 컬럼을 Text에서 JSONB로 변경하는 SQL 마이그레이션 스크립트
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
-- PostgreSQL에서는 ALTER COLUMN TYPE을 사용하여 Text를 JSONB로 변경할 수 있습니다
-- 단, 기존 데이터가 유효한 JSON 형식이어야 합니다

-- 먼저 기존 데이터가 유효한 JSON인지 확인
-- 유효하지 않은 데이터가 있다면 먼저 정리해야 합니다
SELECT id, answer_json 
FROM gri_answer 
WHERE answer_json IS NOT NULL 
  AND answer_json != ''
  AND answer_json::jsonb IS NULL;

-- 4. 컬럼 타입 변경 실행
-- 기존 데이터가 모두 유효한 JSON이라면 실행
ALTER TABLE gri_answer 
ALTER COLUMN answer_json TYPE JSONB 
USING answer_json::JSONB;

-- 5. 변경 결과 확인
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'gri_answer' AND column_name = 'answer_json';

-- 6. JSONB 기능 테스트
-- 테스트 데이터 삽입
INSERT INTO gri_answer (question_id, session_key, answer_text, answer_json)
VALUES (999, 'test_session', 'Test answer', '{"test_key": "test_value", "nested": {"level1": "value1"}, "array": [1, 2, 3]}'::jsonb)
RETURNING id;

-- JSONB 쿼리 테스트
SELECT 
    answer_json->>'test_key' as test_value,
    answer_json->'nested'->>'level1' as nested_value,
    answer_json->'array' as array_value
FROM gri_answer 
WHERE id = (SELECT MAX(id) FROM gri_answer WHERE session_key = 'test_session');

-- 테스트 데이터 정리
DELETE FROM gri_answer WHERE session_key = 'test_session';

-- 7. 최종 확인
SELECT 
    'Migration completed successfully!' as status,
    'answer_json column is now JSONB type' as details;
