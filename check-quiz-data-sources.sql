-- =====================================================
-- ALTERNATIVE DATA FETCHING STRATEGY
-- =====================================================
-- This checks multiple possible data sources for quiz results

-- 1. Check what tables exist that might contain quiz results
SELECT table_name, table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%quiz%' 
  OR table_name LIKE '%result%'
  OR table_name = 'students'
ORDER BY table_name;

-- 2. If quiz_results table exists, check its structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'quiz_results' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. If quiz_results table exists, show sample data
-- SELECT * FROM quiz_results LIMIT 5;

-- 4. Alternative: Check if students table has any quiz-related columns
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'students' 
  AND table_schema = 'public'
  AND (
    column_name ILIKE '%quiz%' 
    OR column_name ILIKE '%score%'
    OR column_name ILIKE '%result%'
    OR column_name ILIKE '%history%'
  )
ORDER BY column_name;

-- 5. Check if there are foreign key relationships that might indicate where quiz results are stored
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
  AND (tc.table_name = 'students' OR tc.table_name = 'quiz_results' OR tc.table_name LIKE '%quiz%');

-- 6. Show what data actually exists in students table
SELECT 
    COUNT(*) as total_students,
    COUNT(CASE WHEN quiz_history IS NOT NULL AND quiz_history != '[]'::jsonb THEN 1 END) as students_with_quiz_data
FROM students;

-- 7. If there's quiz data, show a sample
-- SELECT 
--     id,
--     name,
--     email,
--     quiz_history,
--     jsonb_array_length(COALESCE(quiz_history, '[]'::jsonb)) as quiz_count
-- FROM students 
-- WHERE quiz_history IS NOT NULL 
--   AND quiz_history != '[]'::jsonb
-- LIMIT 3;
