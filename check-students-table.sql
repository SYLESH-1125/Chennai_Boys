-- =====================================================
-- CHECK EXISTING STUDENTS TABLE STRUCTURE
-- =====================================================
-- This script checks what columns already exist in the students table

-- 1. Check current students table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'students' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if quiz_history column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'students' 
              AND column_name = 'quiz_history'
        ) 
        THEN 'quiz_history column EXISTS'
        ELSE 'quiz_history column MISSING'
    END as quiz_history_status;

-- 3. Show sample student data (first 3 students)
SELECT * FROM students LIMIT 3;

-- 4. Check if any students have quiz-related data in existing columns
SELECT 
    COUNT(*) as total_students,
    COUNT(CASE WHEN quiz_history IS NOT NULL THEN 1 END) as students_with_quiz_history
FROM students;
