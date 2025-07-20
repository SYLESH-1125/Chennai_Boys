-- =====================================================
-- FIX FACULTY ANALYTICS - ENSURE QUIZ_HISTORY EXISTS
-- =====================================================
-- This script ensures that students have the quiz_history column and faculty can see attendance

-- 1. Ensure students table has quiz_history column (JSONB array to store quiz results)
ALTER TABLE students ADD COLUMN IF NOT EXISTS quiz_history JSONB DEFAULT '[]'::JSONB;

-- 2. Add indexes for better performance on quiz_history queries
CREATE INDEX IF NOT EXISTS idx_students_quiz_history ON students USING GIN (quiz_history);

-- 3. Ensure quiz_history is not null for students who have taken quizzes
UPDATE students 
SET quiz_history = '[]'::JSONB 
WHERE quiz_history IS NULL;

-- 4. Add other useful columns that might be missing
ALTER TABLE students ADD COLUMN IF NOT EXISTS avg_score NUMERIC(5,2) DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS quizzes_taken INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS accuracy_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS best_score NUMERIC(5,2) DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS lowest_score NUMERIC(5,2) DEFAULT 100;

-- 5. Add comments for documentation
COMMENT ON COLUMN students.quiz_history IS 'JSONB array storing all quiz attempts and results for this student';
COMMENT ON COLUMN students.avg_score IS 'Average score across all quizzes taken by this student';
COMMENT ON COLUMN students.quizzes_taken IS 'Total number of quizzes attempted by this student';
COMMENT ON COLUMN students.accuracy_rate IS 'Overall accuracy rate as a percentage';

-- 6. Create a function to update student statistics from quiz_history
CREATE OR REPLACE FUNCTION update_student_stats(student_id UUID)
RETURNS VOID AS $$
DECLARE
    student_record RECORD;
    quiz_record JSONB;
    total_score NUMERIC := 0;
    quiz_count INTEGER := 0;
    max_score NUMERIC := 0;
    min_score NUMERIC := 100;
    total_correct INTEGER := 0;
    total_questions INTEGER := 0;
BEGIN
    -- Get student data
    SELECT quiz_history INTO student_record FROM students WHERE id = student_id;
    
    -- Process each quiz in the history
    FOR quiz_record IN SELECT jsonb_array_elements(student_record.quiz_history)
    LOOP
        IF (quiz_record->>'score')::NUMERIC IS NOT NULL THEN
            total_score := total_score + (quiz_record->>'score')::NUMERIC;
            quiz_count := quiz_count + 1;
            
            -- Track best and worst scores
            IF (quiz_record->>'score')::NUMERIC > max_score THEN
                max_score := (quiz_record->>'score')::NUMERIC;
            END IF;
            
            IF (quiz_record->>'score')::NUMERIC < min_score THEN
                min_score := (quiz_record->>'score')::NUMERIC;
            END IF;
            
            -- Track accuracy if available
            IF (quiz_record->>'correct_answers')::INTEGER IS NOT NULL AND 
               (quiz_record->>'total_questions')::INTEGER IS NOT NULL THEN
                total_correct := total_correct + (quiz_record->>'correct_answers')::INTEGER;
                total_questions := total_questions + (quiz_record->>'total_questions')::INTEGER;
            END IF;
        END IF;
    END LOOP;
    
    -- Update student statistics
    UPDATE students 
    SET 
        avg_score = CASE WHEN quiz_count > 0 THEN total_score / quiz_count ELSE 0 END,
        quizzes_taken = quiz_count,
        best_score = CASE WHEN quiz_count > 0 THEN max_score ELSE 0 END,
        lowest_score = CASE WHEN quiz_count > 0 THEN min_score ELSE 0 END,
        accuracy_rate = CASE WHEN total_questions > 0 THEN (total_correct::NUMERIC / total_questions * 100) ELSE 0 END
    WHERE id = student_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Update stats for all existing students
DO $$
DECLARE
    student_rec RECORD;
BEGIN
    FOR student_rec IN SELECT id FROM students WHERE quiz_history IS NOT NULL AND jsonb_array_length(quiz_history) > 0
    LOOP
        PERFORM update_student_stats(student_rec.id);
    END LOOP;
END $$;

-- 8. Show some sample data to verify everything is working
SELECT 
    'Students with quiz history:' as info,
    COUNT(*) as count
FROM students 
WHERE quiz_history IS NOT NULL AND jsonb_array_length(quiz_history) > 0;

-- 9. Show sample quiz history for debugging
SELECT 
    id,
    name,
    full_name,
    quizzes_taken,
    avg_score,
    jsonb_array_length(quiz_history) as quiz_history_count
FROM students 
WHERE quiz_history IS NOT NULL AND jsonb_array_length(quiz_history) > 0
ORDER BY quizzes_taken DESC
LIMIT 5;
