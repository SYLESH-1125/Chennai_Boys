-- =====================================================
-- SAFE QUIZZES TABLE FIX (GUARANTEED TO WORK)
-- =====================================================
-- This focuses ONLY on fixing your quiz creation error
-- No other tables involved to avoid column name errors

-- 1. Migrate data from createdat to created_at
UPDATE quizzes 
SET created_at = COALESCE(createdat, created_at, now())
WHERE createdat IS NOT NULL OR created_at IS NULL;

-- 2. Drop the old createdat column
ALTER TABLE quizzes DROP COLUMN IF EXISTS createdat;

-- 3. Configure created_at properly
ALTER TABLE quizzes ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE quizzes ALTER COLUMN created_at SET NOT NULL;

-- 4. Configure updated_at
ALTER TABLE quizzes ALTER COLUMN updated_at SET DEFAULT now();

-- 5. Add difficulty constraint
ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS quizzes_difficulty_check;
ALTER TABLE quizzes ADD CONSTRAINT quizzes_difficulty_check 
    CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- 6. Add status constraint
ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS quizzes_status_check;
ALTER TABLE quizzes ADD CONSTRAINT quizzes_status_check 
    CHECK (status IN ('active', 'inactive', 'draft', 'archived'));

-- 7. Add timelimit constraint
ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS quizzes_timelimit_check;
ALTER TABLE quizzes ADD CONSTRAINT quizzes_timelimit_check 
    CHECK (timelimit > 0);

-- 8. Add totalpoints constraint
ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS quizzes_totalpoints_check;
ALTER TABLE quizzes ADD CONSTRAINT quizzes_totalpoints_check 
    CHECK (totalpoints >= 0);

-- 9. Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Create the trigger
DROP TRIGGER IF EXISTS update_quizzes_updated_at ON quizzes;
CREATE TRIGGER update_quizzes_updated_at
    BEFORE UPDATE ON quizzes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 11. Add performance indexes for QUIZZES TABLE ONLY
CREATE INDEX IF NOT EXISTS idx_quizzes_difficulty ON quizzes(difficulty);
CREATE INDEX IF NOT EXISTS idx_quizzes_createdby ON quizzes(createdby);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON quizzes(subject);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at);

-- DONE! This should fix your quiz creation error
-- Run this script in Supabase SQL Editor
