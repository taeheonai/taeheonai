-- ========================================
-- Fix User Table Only (English Comments)
-- ========================================

-- 1. Check current company_id column type
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user' AND column_name = 'company_id';

-- 2. Check what corporations exist in the table
SELECT id, corp_code, companyname, market FROM corporation ORDER BY id;

-- 3. Change company_id from VARCHAR to INTEGER
-- First, drop the existing column
ALTER TABLE "user" DROP COLUMN IF EXISTS company_id;

-- Then, add new INTEGER column
ALTER TABLE "user" ADD COLUMN company_id INTEGER;

-- 4. Add foreign key constraint
DO $$
BEGIN
    -- Check if foreign key constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%corporation%'
    ) THEN
        -- Add foreign key constraint
        ALTER TABLE "user" 
        ADD CONSTRAINT fk_user_corporation 
        FOREIGN KEY (company_id) REFERENCES corporation(id);
        
        RAISE NOTICE 'Foreign key constraint added successfully.';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists.';
    END IF;
END $$;

-- 5. Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS ix_user_company_id ON "user"(company_id);
CREATE INDEX IF NOT EXISTS ix_user_session_company ON "user"(auth_id, company_id);

-- 6. Check modification results
SELECT 
    'user' as table_name,
    COUNT(*) as total_users,
    COUNT(company_id) as users_with_company
FROM "user";

-- 7. Verify foreign key constraint
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'user';
