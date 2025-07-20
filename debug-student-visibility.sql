-- =====================================================
-- DEBUG SCRIPT: CHECK WHY STUDENT IS NOT VISIBLE IN FACULTY ANALYTICS
-- =====================================================

-- 1. Check if students table has quiz_history column
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'students' 
  AND column_name = 'quiz_history';

-- 2. Check current students and their quiz_history
SELECT 
    id,
    name,
    full_name,
    email,
    quiz_history,
    jsonb_array_length(quiz_history) as quiz_count
FROM students 
WHERE quiz_history IS NOT NULL 
  AND jsonb_array_length(quiz_history) > 0
ORDER BY jsonb_array_length(quiz_history) DESC;

-- 3. Check specific student's quiz history (replace 'your-student-id' with actual ID)
-- You can get your student ID by running: SELECT id, name, email FROM students WHERE email = 'your-email@example.com';
-- SELECT 
--     id,
--     name,
--     email,
--     quiz_history,
--     jsonb_pretty(quiz_history) as formatted_quiz_history
-- FROM students 
-- WHERE id = 'your-student-id-here';

-- 4. Check all quizzes and their creators
SELECT 
    id,
    code,
    title,
    createdby,
    created_at
FROM quizzes 
ORDER BY created_at DESC;

-- 5. Sample quiz_history structure (this is what should be in students.quiz_history)
/*
Expected structure:
[
  {
    "quiz_id": "quiz-uuid",
    "quiz_code": "ABC123",
    "quiz_title": "Sample Quiz",
    "score": 85,
    "total_questions": 10,
    "correct_answers": 8,
    "submitted_at": "2025-01-20T10:30:00Z",
    "taken_at": "2025-01-20T10:25:00Z",
    "status": "completed"
  }
]
*/

-- 6. If quiz_history column doesn't exist, create it:
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS quiz_history JSONB DEFAULT '[]'::JSONB;

-- 7. If you need to manually add a test quiz result for debugging:
-- UPDATE students 
-- SET quiz_history = '[{"quiz_id": "test-id", "quiz_code": "TEST123", "quiz_title": "Test Quiz", "score": 90, "total_questions": 5, "correct_answers": 4, "submitted_at": "2025-01-20T10:30:00Z", "status": "completed"}]'::JSONB
-- WHERE id = 'your-student-id-here';

-- 8. Check which faculty (users) exist
SELECT 
    id,
    email,
    name
FROM users 
ORDER BY email;

-- 9. Cross-check: Find quizzes created by a specific faculty member
-- Replace 'faculty-user-id' with the actual faculty user ID
-- SELECT 
--     id,
--     code,
--     title,
--     createdby,
--     created_at
-- FROM quizzes 
-- WHERE createdby = 'faculty-user-id-here'
-- ORDER BY created_at DESC;

-- 10. Final check: Simulate what the faculty dashboard query would return
-- This simulates the corrected faculty dashboard logic:
/*
WITH faculty_quizzes AS (
    SELECT id, code FROM quizzes WHERE createdby = 'your-faculty-id-here'
)
SELECT DISTINCT
    s.id,
    s.name,
    s.full_name,
    s.email,
    s.quiz_history,
    jsonb_array_length(s.quiz_history) as total_quiz_history
FROM students s
CROSS JOIN jsonb_array_elements(s.quiz_history) AS quiz_element
WHERE 
    s.quiz_history IS NOT NULL 
    AND (
        (quiz_element->>'quiz_id') IN (SELECT id::text FROM faculty_quizzes)
        OR 
        (quiz_element->>'quiz_code') IN (SELECT code FROM faculty_quizzes)
    );
*/
