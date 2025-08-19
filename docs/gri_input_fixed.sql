-- GRI Input Tables (Improved Version for JSON Data)
-- Drop existing objects if they exist

-- A. Categories (GRI-2, GRI-3, GRI-201, etc.)
CREATE TABLE gri_category (
  id            SERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,        -- 'GRI-2', 'GRI-201', etc.
  title         TEXT NOT NULL,               -- 'General Disclosures', 'Economic Performance', etc.
  display_order INT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- B. GRI Items (2-1, 2-2, 201-1, etc.)
CREATE TABLE gri_item (
  id            SERIAL PRIMARY KEY,
  category_id   INT NOT NULL REFERENCES gri_category(id) ON DELETE CASCADE,
  index_no      TEXT NOT NULL,               -- '2-1', '2-2', '201-1', etc.
  title         TEXT,                        -- Optional title from categories JSON
  display_order INT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (category_id, index_no)
);

-- C. Questions (a, b, c, d, e, f, g, i, v, etc.)
CREATE TYPE question_type AS ENUM ('question', 'reference');

CREATE TABLE gri_question (
  id            SERIAL PRIMARY KEY,
  item_id       INT NOT NULL REFERENCES gri_item(id) ON DELETE CASCADE,
  key_alpha     TEXT NOT NULL,               -- 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'i', 'v', etc.
  question_text TEXT NOT NULL,               -- The actual question text
  reference_text TEXT,                       -- Reference text if available
  question_type question_type DEFAULT 'question',
  display_order INT DEFAULT 0,
  required      BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (item_id, key_alpha)
);

-- D. Answers (User responses)
CREATE TABLE gri_answer (
  id            SERIAL PRIMARY KEY,
  question_id   INT NOT NULL REFERENCES gri_question(id) ON DELETE CASCADE,
  session_key   TEXT NOT NULL,               -- Company identifier (e.g., 'ACME-2025')
  answer_text   TEXT,                        -- Free text answer
  answer_json   JSONB,                       -- Structured data if needed
  is_completed  BOOLEAN DEFAULT FALSE,       -- Whether this question has been answered
  completed_at  TIMESTAMP,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (question_id, session_key)
);

-- Create indexes for better performance
CREATE INDEX idx_gri_item_category ON gri_item(category_id, display_order);
CREATE INDEX idx_gri_item_index ON gri_item(index_no);
CREATE INDEX idx_gri_question_item ON gri_question(item_id, display_order);
CREATE INDEX idx_gri_question_key ON gri_question(key_alpha);
CREATE INDEX idx_gri_answer_question ON gri_answer(question_id);
CREATE INDEX idx_gri_answer_session ON gri_answer(session_key);

-- Create a view for easier querying
CREATE VIEW gri_complete_view AS
SELECT 
  c.code as category_code,
  c.title as category_title,
  i.index_no,
  i.title as item_title,
  q.key_alpha,
  q.question_text,
  q.reference_text,
  q.question_type,
  a.answer_text,
  a.answer_json,
  a.is_completed,
  a.session_key,
  a.completed_at
FROM gri_category c
JOIN gri_item i ON c.id = i.category_id
JOIN gri_question q ON i.id = q.item_id
LEFT JOIN gri_answer a ON q.id = a.question_id;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_gri_answer_updated_at 
    BEFORE UPDATE ON gri_answer 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sample data insertion functions
CREATE OR REPLACE FUNCTION insert_gri_category_data(
  p_code TEXT,
  p_title TEXT,
  p_display_order INT DEFAULT 0
) RETURNS INT AS $$
DECLARE
  v_id INT;
BEGIN
  INSERT INTO gri_category (code, title, display_order)
  VALUES (p_code, p_title, p_display_order)
  ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    display_order = EXCLUDED.display_order
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION insert_gri_item_data(
  p_category_code TEXT,
  p_index_no TEXT,
  p_title TEXT DEFAULT NULL,
  p_display_order INT DEFAULT 0
) RETURNS INT AS $$
DECLARE
  v_category_id INT;
  v_id INT;
BEGIN
  SELECT id INTO v_category_id FROM gri_category WHERE code = p_category_code;
  
  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'Category % not found', p_category_code;
  END IF;
  
  INSERT INTO gri_item (category_id, index_no, title, display_order)
  VALUES (v_category_id, p_index_no, p_title, p_display_order)
  ON CONFLICT (category_id, index_no) DO UPDATE SET
    title = EXCLUDED.title,
    display_order = EXCLUDED.display_order
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION insert_gri_question_data(
  p_index_no TEXT,
  p_key_alpha TEXT,
  p_question_text TEXT,
  p_reference_text TEXT DEFAULT NULL,
  p_question_type question_type DEFAULT 'question',
  p_display_order INT DEFAULT 0
) RETURNS INT AS $$
DECLARE
  v_item_id INT;
  v_id INT;
BEGIN
  SELECT id INTO v_item_id FROM gri_item WHERE index_no = p_index_no;
  
  IF v_item_id IS NULL THEN
    RAISE EXCEPTION 'Item % not found', p_index_no;
  END IF;
  
  INSERT INTO gri_question (item_id, key_alpha, question_text, reference_text, question_type, display_order)
  VALUES (v_item_id, p_key_alpha, p_question_text, p_reference_text, p_question_type, p_display_order)
  ON CONFLICT (item_id, key_alpha) DO UPDATE SET
    question_text = EXCLUDED.question_text,
    reference_text = EXCLUDED.reference_text,
    question_type = EXCLUDED.question_type,
    display_order = EXCLUDED.display_order
  RETURNING id INTO v_id;
  
  RETURN v_id;
 END;
$$ LANGUAGE plpgsql;

-- Verify tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'gri%'
ORDER BY table_name;
