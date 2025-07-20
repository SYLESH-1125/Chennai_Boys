-- =====================================================
-- QUIZZES TABLE COLUMN FIXES AND UPDATES
-- =====================================================

-- Fix the main issue: Application expects 'created_at' but DB has 'createdat'
-- Since both columns exist, we need to consolidate them

-- 1. First, migrate any data from createdat to created_at (in case createdat has newer data)
UPDATE quizzes 
SET created_at = COALESCE(createdat, created_at, now())
WHERE createdat IS NOT NULL OR created_at IS NULL;

-- 2. Drop the old createdat column since we now have created_at
ALTER TABLE quizzes DROP COLUMN IF EXISTS createdat;

-- 3. Ensure created_at is properly configured (NOT NULL with default)
ALTER TABLE quizzes ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE quizzes ALTER COLUMN created_at SET NOT NULL;

-- 4. Ensure updated_at has proper default 
ALTER TABLE quizzes ALTER COLUMN updated_at SET DEFAULT now();

-- 5. Make sure difficulty column has proper constraint
ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS quizzes_difficulty_check;
ALTER TABLE quizzes ADD CONSTRAINT quizzes_difficulty_check 
    CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- 6. Add proper constraints for data integrity
ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS quizzes_status_check;
ALTER TABLE quizzes ADD CONSTRAINT quizzes_status_check 
    CHECK (status IN ('active', 'inactive', 'draft', 'archived'));

ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS quizzes_timelimit_check;
ALTER TABLE quizzes ADD CONSTRAINT quizzes_timelimit_check 
    CHECK (timelimit > 0);

ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS quizzes_totalpoints_check;
ALTER TABLE quizzes ADD CONSTRAINT quizzes_totalpoints_check 
    CHECK (totalpoints >= 0);

-- 7. Create trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Create trigger to automatically update updated_at on any row update
DROP TRIGGER IF EXISTS update_quizzes_updated_at ON quizzes;
CREATE TRIGGER update_quizzes_updated_at
    BEFORE UPDATE ON quizzes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Add performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_quizzes_difficulty ON quizzes(difficulty);
CREATE INDEX IF NOT EXISTS idx_quizzes_createdby ON quizzes(createdby);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON quizzes(subject);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at);

-- 10. Add indexes for related tables (section-wise analysis)
-- Note: Using correct column names based on actual database structure
CREATE INDEX IF NOT EXISTS idx_students_department_section ON students(department, section);
CREATE INDEX IF NOT EXISTS idx_quiz_results_student_quiz ON quiz_results(studentid, quiz_id);

-- Comments for reference:
-- This script fixes the main issue: column naming mismatch between 'createdat' and 'created_at'
-- Your application code expects 'created_at' but the database has 'createdat'
-- Run ONLY the updates section above (lines 1-50) in your Supabase SQL editor
-- Skip the inspection queries below - they're just for checking

-- =====================================================
-- TABLE STRUCTURE INSPECTION QUERIES
-- =====================================================

-- 1. Check the current structure of the quizzes table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'quizzes' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Alternative way to describe the quizzes table structure
\d+ quizzes;

-- 3. Show all constraints on the quizzes table
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.quizzes'::regclass;

-- 4. Check if difficulty column exists specifically
SELECT 
    EXISTS(
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'quizzes' 
          AND column_name = 'difficulty' 
          AND table_schema = 'public'
    ) AS difficulty_column_exists;

-- 5. Show indexes on the quizzes table
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'quizzes'
  AND schemaname = 'public';

-- 6. Get sample data from quizzes table (first 5 rows)
SELECT * FROM quizzes LIMIT 5;

-- 7. Check total number of records in quizzes table
SELECT COUNT(*) as total_quizzes FROM quizzes;
