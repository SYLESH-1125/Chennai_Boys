-- =====================================================
-- CHECK DATABASE STRUCTURE AND FIX QUERY ISSUES
-- =====================================================

-- 1. Check what tables actually exist
SELECT table_name, table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Check if quiz_results table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'quiz_results' 
              AND table_schema = 'public'
        ) 
        THEN 'quiz_results table EXISTS'
        ELSE 'quiz_results table DOES NOT EXIST'
    END as quiz_results_status;

-- 3. If quiz_results exists, show its structure
-- (Uncomment if the table exists)
/*
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'quiz_results' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
*/

-- 4. Check students table structure (specifically quiz_history)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'students' 
  AND table_schema = 'public'
  AND column_name IN ('quiz_history', 'id', 'name', 'full_name', 'email')
ORDER BY ordinal_position;

-- 5. Show sample data from students (to verify quiz_history structure)
SELECT 
    id,
    full_name,
    email,
    CASE 
        WHEN quiz_history IS NULL THEN 'NULL'
        WHEN jsonb_array_length(quiz_history) = 0 THEN 'EMPTY ARRAY'
        ELSE jsonb_array_length(quiz_history)::text || ' quiz(s)'
    END as quiz_history_status
FROM students 
LIMIT 5;

-- 6. Check RLS (Row Level Security) policies that might be blocking queries
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('students', 'quiz_results', 'quizzes')
ORDER BY tablename, policyname;
