-- =====================================================
-- FIX QUIZ_RESULTS TABLE SCHEMA
-- =====================================================

-- This fixes the error: Could not find the 'questions' column of 'quiz_results' in the schema cache
-- The application is trying to insert data into columns that don't exist

-- First, let's check the current structure of quiz_results table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'quiz_results' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add missing columns to quiz_results table
-- Based on the application code, these columns are needed:

-- 1. Add questions column (to store quiz questions with the result)
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS questions JSONB;

-- 2. Add answers column (to store student's answers)
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS answers JSONB;

-- 3. Add correct_answers column (to store correct answers for comparison)
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS correct_answers JSONB;

-- 4. Add total_questions column (to store total number of questions)
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0;

-- 5. Add time_spent column (to track time spent on quiz)
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS time_spent INTEGER DEFAULT 0;

-- 6. Add submitted_at column (to track submission timestamp)
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 7. Add taken_at column (to track when quiz was taken)
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS taken_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 8. Add attempts column (to track number of attempts)
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 1;

-- 9. Add status column (to track quiz completion status)
ALTER TABLE quiz_results ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed';

-- 10. Ensure existing columns have proper defaults
ALTER TABLE quiz_results ALTER COLUMN score SET DEFAULT 0;

-- 11. Add constraints for data integrity
ALTER TABLE quiz_results DROP CONSTRAINT IF EXISTS quiz_results_score_check;
ALTER TABLE quiz_results ADD CONSTRAINT quiz_results_score_check 
    CHECK (score >= 0 AND score <= 100);

ALTER TABLE quiz_results DROP CONSTRAINT IF EXISTS quiz_results_attempts_check;
ALTER TABLE quiz_results ADD CONSTRAINT quiz_results_attempts_check 
    CHECK (attempts > 0);

ALTER TABLE quiz_results DROP CONSTRAINT IF EXISTS quiz_results_total_questions_check;
ALTER TABLE quiz_results ADD CONSTRAINT quiz_results_total_questions_check 
    CHECK (total_questions >= 0);

ALTER TABLE quiz_results DROP CONSTRAINT IF EXISTS quiz_results_time_spent_check;
ALTER TABLE quiz_results ADD CONSTRAINT quiz_results_time_spent_check 
    CHECK (time_spent >= 0);

ALTER TABLE quiz_results DROP CONSTRAINT IF EXISTS quiz_results_status_check;
ALTER TABLE quiz_results ADD CONSTRAINT quiz_results_status_check 
    CHECK (status IN ('completed', 'in_progress', 'abandoned', 'submitted'));

-- 12. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_results_student_id ON quiz_results(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_id ON quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_status ON quiz_results(status);
CREATE INDEX IF NOT EXISTS idx_quiz_results_submitted_at ON quiz_results(submitted_at);
CREATE INDEX IF NOT EXISTS idx_quiz_results_score ON quiz_results(score);

-- 13. Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_quiz_results_student_quiz ON quiz_results(student_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_score ON quiz_results(quiz_id, score);

-- 14. Add comments for documentation
COMMENT ON TABLE quiz_results IS 'Stores student quiz results with detailed answers and performance data';
COMMENT ON COLUMN quiz_results.questions IS 'JSONB array of quiz questions asked to the student';
COMMENT ON COLUMN quiz_results.answers IS 'JSONB object containing student answers keyed by question ID';
COMMENT ON COLUMN quiz_results.correct_answers IS 'JSONB object containing correct answers for comparison';
COMMENT ON COLUMN quiz_results.total_questions IS 'Total number of questions in the quiz';
COMMENT ON COLUMN quiz_results.time_spent IS 'Time spent on quiz in seconds';
COMMENT ON COLUMN quiz_results.attempts IS 'Number of attempts for this quiz by this student';
COMMENT ON COLUMN quiz_results.status IS 'Quiz completion status (completed, in_progress, abandoned, submitted)';

-- Check the updated structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'quiz_results' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
