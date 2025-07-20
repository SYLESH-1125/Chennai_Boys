-- =====================================================
-- DEBUG: Check if quiz_history column exists
-- =====================================================

-- Check if quiz_history column exists in students table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'students' 
  AND table_schema = 'public'
  AND column_name = 'quiz_history';

-- If the above returns no rows, run this:
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS quiz_history JSONB DEFAULT '[]'::JSONB;

-- Check current students table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'students' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
