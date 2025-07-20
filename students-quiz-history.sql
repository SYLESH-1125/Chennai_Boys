-- =====================================================
-- ADD QUIZ HISTORY TO STUDENTS TABLE
-- =====================================================

-- Add quiz_history column to students table to store all quiz results
ALTER TABLE students ADD COLUMN IF NOT EXISTS quiz_history JSONB DEFAULT '[]'::JSONB;

-- Add indexes for quiz_history queries
CREATE INDEX IF NOT EXISTS idx_students_quiz_history ON students USING GIN (quiz_history);

-- Add comment for documentation
COMMENT ON COLUMN students.quiz_history IS 'JSONB array storing all quiz attempts and results for this student';
