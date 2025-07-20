-- =====================================================
-- CHECK QUIZ ATTEMPTS TABLE STRUCTURE
-- =====================================================

-- 1. Check if quiz_attempts table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'quiz_attempts' 
              AND table_schema = 'public'
        ) 
        THEN 'quiz_attempts table EXISTS'
        ELSE 'quiz_attempts table DOES NOT EXIST'
    END as quiz_attempts_status;

-- 2. Show quiz_attempts table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'quiz_attempts' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check foreign key relationships for quiz_attempts
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
  AND tc.table_name = 'quiz_attempts';

-- 4. Show sample data from quiz_attempts
SELECT * FROM quiz_attempts LIMIT 3;

-- 5. Check what column names are used for linking
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'quiz_attempts' 
  AND table_schema = 'public'
  AND (
    column_name ILIKE '%quiz%' 
    OR column_name ILIKE '%code%'
    OR column_name ILIKE '%id%'
  )
ORDER BY column_name;

-- 6. Show all columns to see the exact structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'quiz_attempts' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
