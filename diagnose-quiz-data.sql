-- =====================================================
-- DIAGNOSTIC: CHECK YOUR QUIZ DATA AND FACULTY RELATIONSHIPS
-- =====================================================

-- 1. Check if you have any quiz results in your quiz_history
SELECT 
    id,
    full_name,
    email,
    quizzes_taken,
    avg_score,
    jsonb_array_length(COALESCE(quiz_history, '[]'::jsonb)) as quiz_history_length,
    quiz_history
FROM students 
WHERE email = 'YOUR_EMAIL@example.com'  -- Replace with your actual email
   OR full_name ILIKE '%YOUR_NAME%'      -- Replace with your actual name
   OR username ILIKE '%YOUR_USERNAME%';  -- Replace with your actual username

-- 2. Show all students who have taken quizzes (to see the data structure)
SELECT 
    id,
    full_name,
    email,
    jsonb_array_length(COALESCE(quiz_history, '[]'::jsonb)) as quiz_count,
    jsonb_pretty(quiz_history) as formatted_quiz_history
FROM students 
WHERE quiz_history IS NOT NULL 
  AND jsonb_array_length(quiz_history) > 0
LIMIT 3;

-- 3. Check all quizzes and their creators
SELECT 
    id,
    code,
    title,
    createdby,
    created_at,
    status
FROM quizzes 
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check users table to see faculty IDs
SELECT 
    id,
    email,
    name
FROM auth.users 
ORDER BY email
LIMIT 10;

-- 5. Cross-reference: Find quiz_history entries that match existing quizzes
SELECT DISTINCT
    s.full_name,
    s.email,
    quiz_element->>'quiz_id' as quiz_id_from_history,
    quiz_element->>'quiz_code' as quiz_code_from_history,
    quiz_element->>'quiz_title' as quiz_title_from_history,
    quiz_element->>'score' as score,
    quiz_element->>'submitted_at' as submitted_at,
    q.id as actual_quiz_id,
    q.code as actual_quiz_code,
    q.title as actual_quiz_title,
    q.createdby as faculty_id
FROM students s
CROSS JOIN jsonb_array_elements(s.quiz_history) AS quiz_element
LEFT JOIN quizzes q ON (
    q.id::text = quiz_element->>'quiz_id' 
    OR q.code = quiz_element->>'quiz_code'
)
WHERE s.quiz_history IS NOT NULL 
  AND jsonb_array_length(s.quiz_history) > 0
ORDER BY quiz_element->>'submitted_at' DESC
LIMIT 10;

-- 6. Check if there's a mismatch in quiz ID/code storage
SELECT 
    'Quiz History IDs:' as type,
    quiz_element->>'quiz_id' as identifier
FROM students s
CROSS JOIN jsonb_array_elements(s.quiz_history) AS quiz_element
WHERE s.quiz_history IS NOT NULL
UNION ALL
SELECT 
    'Actual Quiz IDs:' as type,
    id::text as identifier
FROM quizzes
ORDER BY type, identifier;

-- 7. Show sample quiz_history structure for reference
SELECT 
    'Sample quiz_history entry structure:' as info,
    quiz_element
FROM students s
CROSS JOIN jsonb_array_elements(s.quiz_history) AS quiz_element
WHERE s.quiz_history IS NOT NULL 
LIMIT 1;
