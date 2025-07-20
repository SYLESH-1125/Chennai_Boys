-- =====================================================
-- QUICK FIX: VERIFY AND TEST YOUR DATA
-- =====================================================

-- Step 1: Find yourself in the students table
SELECT 
    'Your student record:' as info,
    id,
    full_name,
    email,
    username,
    quizzes_taken,
    avg_score,
    jsonb_array_length(COALESCE(quiz_history, '[]'::jsonb)) as quiz_history_count
FROM students 
WHERE email ILIKE '%YOUR_EMAIL%'  -- Replace YOUR_EMAIL with part of your actual email
   OR full_name ILIKE '%YOUR_NAME%'  -- Replace YOUR_NAME with part of your actual name
   OR username ILIKE '%YOUR_USERNAME%';

-- Step 2: Check if you have any quiz data
SELECT 
    'Your quiz history:' as info,
    jsonb_pretty(quiz_history) as your_quiz_history
FROM students 
WHERE email ILIKE '%YOUR_EMAIL%';  -- Replace with your email

-- Step 3: Check recent quizzes and their creators
SELECT 
    'Recent quizzes:' as info,
    id,
    code,
    title,
    createdby as faculty_id,
    created_at
FROM quizzes 
ORDER BY created_at DESC
LIMIT 5;

-- Step 4: Check faculty users
SELECT 
    'Faculty users:' as info,
    id,
    email,
    name
FROM auth.users
ORDER BY email;

-- If you want to manually test with sample data, uncomment and run this:
-- (Replace the UUIDs and email with actual values from the queries above)

/*
-- Add a test quiz result to your student record
UPDATE students 
SET quiz_history = COALESCE(quiz_history, '[]'::jsonb) || 
    '[{
        "quiz_id": "REPLACE_WITH_ACTUAL_QUIZ_ID",
        "quiz_code": "REPLACE_WITH_ACTUAL_QUIZ_CODE", 
        "quiz_title": "Test Quiz",
        "score": 85,
        "total_questions": 10,
        "correct_answers": 8,
        "submitted_at": "2025-01-20T10:30:00Z",
        "status": "completed"
    }]'::jsonb
WHERE email = 'YOUR_ACTUAL_EMAIL@example.com';
*/
