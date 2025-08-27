-- PostgreSQL Migration Script
-- Rename user.company_id to user.corporation_id and add FK constraints

-- Step 1: Check current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user' AND column_name IN ('company_id', 'corporation_id');

-- Step 2: Check existing constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'user' AND constraint_type = 'FOREIGN KEY';

-- Step 3: Rename column (if not already renamed)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'company_id') THEN
        ALTER TABLE "user" RENAME COLUMN company_id TO corporation_id;
        RAISE NOTICE 'Column renamed from company_id to corporation_id';
    ELSE
        RAISE NOTICE 'Column already renamed to corporation_id';
    END IF;
END $$;

-- Step 4: Type correction (only if needed)
ALTER TABLE "user"
  ALTER COLUMN corporation_id TYPE integer
  USING NULLIF(TRIM(corporation_id::text), '')::integer;

-- Step 5: Clean orphan data
UPDATE "user" 
SET corporation_id = NULL
WHERE corporation_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM corporation WHERE id = corporation_id);

-- Step 6: Create index (if not exists)
CREATE INDEX IF NOT EXISTS ix_user_corporation_id ON "user"(corporation_id);

-- Step 7: Add FK constraint (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user' AND constraint_name = 'fk_user_corporation'
    ) THEN
        ALTER TABLE "user"
        ADD CONSTRAINT fk_user_corporation
        FOREIGN KEY (corporation_id) REFERENCES corporation(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
        RAISE NOTICE 'FK constraint added successfully';
    ELSE
        RAISE NOTICE 'FK constraint already exists';
    END IF;
END $$;

-- Step 8: Verify the changes
SELECT 
    'user' as table_name,
    COUNT(*) as total_users,
    COUNT(corporation_id) as users_with_corporation
FROM "user";

-- Step 9: Check for orphan records
SELECT u.id, u.corporation_id
FROM "user" u
LEFT JOIN corporation c ON c.id = u.corporation_id
WHERE u.corporation_id IS NOT NULL AND c.id IS NULL;

-- Rollback script (if needed)
/*
-- Drop FK constraint
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS fk_user_corporation;

-- Drop index
DROP INDEX IF EXISTS ix_user_corporation_id;

-- Rename column back
ALTER TABLE "user" RENAME COLUMN corporation_id TO company_id;
*/
