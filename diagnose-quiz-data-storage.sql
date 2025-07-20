-- Check if quiz results are being saved properly
-- Run this in your Supabase SQL editor

-- 1. Check if any students have quiz_history data
SELECT 
    id, 
    name, 
    email,
    quiz_history,
    jsonb_array_length(COALESCE(quiz_history, '[]'::jsonb)) as quiz_count
FROM students 
WHERE quiz_history IS NOT NULL 
  AND quiz_history != '[]'::jsonb
ORDER BY jsonb_array_length(quiz_history) DESC
LIMIT 10;

-- 2. Check specific quiz codes in quiz_history
SELECT 
    s.id,
    s.name,
    s.email,
    quiz_element->>'quiz_code' as quiz_code,
    quiz_element->>'quiz_title' as quiz_title,
    quiz_element->>'score' as score,
    quiz_element->>'status' as status,
    quiz_element->>'submitted_at' as submitted_at
FROM students s,
jsonb_array_elements(s.quiz_history) as quiz_element
WHERE s.quiz_history IS NOT NULL
ORDER BY quiz_element->>'submitted_at' DESC;

-- 3. Check if your user ID has any quiz history
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID
SELECT 
    id, 
    name, 
    email,
    quiz_history
FROM students 
WHERE id = 'YOUR_USER_ID_HERE';

-- 4. Count total students with quiz data vs total students
SELECT 
    (SELECT COUNT(*) FROM students) as total_students,
    (SELECT COUNT(*) FROM students WHERE quiz_history IS NOT NULL AND quiz_history != '[]'::jsonb) as students_with_quiz_history;

-- 5. Check for any quiz_results table records (should be empty based on our analysis)
SELECT COUNT(*) as quiz_results_count FROM quiz_results;
