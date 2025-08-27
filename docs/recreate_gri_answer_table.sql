-- =====================================================
-- Recreate GRI Answer Table (Drop and Create New)
-- =====================================================

-- 1. Drop existing table
DROP TABLE IF EXISTS gri_answer CASCADE;

-- 2. Create new table with correct schema
CREATE TABLE gri_answer (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL,
    session_key VARCHAR(100) NOT NULL,
    answer_text TEXT NOT NULL,
    answer_json JSONB,  -- JSONB type
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX idx_gri_answer_question_id ON gri_answer(question_id);
CREATE INDEX idx_gri_answer_session_key ON gri_answer(session_key);
CREATE INDEX idx_gri_answer_created_at ON gri_answer(created_at);

-- 4. Check table structure
\d gri_answer

-- 5. Check column information
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'gri_answer'
ORDER BY ordinal_position;

-- 6. Check if table is empty
SELECT COUNT(*) as row_count FROM gri_answer;

-- =====================================================
-- Insert Test Data (Optional)
-- =====================================================

-- Sample test data (uncomment if needed)
/*
INSERT INTO gri_answer (question_id, session_key, answer_text, answer_json, is_completed) VALUES
(1, 'test_session_001', 'Test answer 1', '{"test": "data"}', true),
(2, 'test_session_001', 'Test answer 2', '{"category": "test"}', false),
(1, 'test_session_002', 'Test answer 3', '{"user": "test"}', true);

-- Check test data
SELECT * FROM gri_answer;
*/

-- =====================================================
-- Grant Permissions (if needed)
-- =====================================================

-- Grant table permissions (uncomment if needed)
-- GRANT ALL PRIVILEGES ON TABLE gri_answer TO your_user;
-- GRANT USAGE, SELECT ON SEQUENCE gri_answer_id_seq TO your_user;
