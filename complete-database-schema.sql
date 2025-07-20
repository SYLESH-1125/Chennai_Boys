-- Complete Database Schema for Chennai Boys Quiz Application
-- Run these commands in your Supabase SQL editor

-- ========================================
-- 1. QUIZZES TABLE UPDATES
-- ========================================

-- Add difficulty column to quizzes table
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(10) DEFAULT 'medium' 
CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- Add timestamp columns to quizzes table if they don't exist
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add comment to explain the columns
COMMENT ON COLUMN quizzes.difficulty IS 'Quiz difficulty level: easy, medium, or hard';
COMMENT ON COLUMN quizzes.created_at IS 'Timestamp when quiz was created';
COMMENT ON COLUMN quizzes.updated_at IS 'Timestamp when quiz was last updated';

-- Optional: Update existing quizzes to have default difficulty
UPDATE quizzes 
SET difficulty = 'medium' 
WHERE difficulty IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_difficulty ON quizzes(difficulty);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at);
CREATE INDEX IF NOT EXISTS idx_quizzes_updated_at ON quizzes(updated_at);

-- Create trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quizzes_updated_at 
    BEFORE UPDATE ON quizzes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 2. STUDENTS TABLE (REQUIRED)
-- ========================================

-- Create students table with comprehensive analytics fields
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(255),
    username VARCHAR(100),
    
    -- Analytics fields expected by the app
    avg_score DECIMAL(5,2) DEFAULT 0,
    avg_accuracy DECIMAL(5,2) DEFAULT 0,
    avg_time_spent INTEGER DEFAULT 0,
    best_score DECIMAL(5,2) DEFAULT 0,
    lowest_score DECIMAL(5,2) DEFAULT 0,
    quizzes_taken INTEGER DEFAULT 0,
    accuracy_rate DECIMAL(5,2) DEFAULT 0,
    knowledge_retention DECIMAL(5,2) DEFAULT 0,
    quiz_history JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for students table
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_avg_score ON students(avg_score);

-- ========================================
-- 3. PROFILE TABLES
-- ========================================

-- Create faculty_profiles table
CREATE TABLE IF NOT EXISTS faculty_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100),
    specialization VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create student_profiles table
CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    student_id VARCHAR(50),
    course VARCHAR(100),
    year_level INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_faculty_profiles_user_id ON faculty_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_faculty_profiles_email ON faculty_profiles(email);
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_email ON student_profiles(email);

-- ========================================
-- 4. USERS TABLE (CUSTOM)
-- ========================================

-- Create custom users table for user management
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    user_type VARCHAR(20) CHECK (user_type IN ('student', 'faculty')),
    profile JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

-- ========================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Students table policies
CREATE POLICY "Students can view their own data" ON students
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Faculty can view all students" ON students
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.user_metadata->>'role' = 'faculty'
        )
    );

CREATE POLICY "Students can update their own data" ON students
    FOR UPDATE USING (user_id = auth.uid());

-- Faculty profiles policies
CREATE POLICY "Faculty can manage their own profile" ON faculty_profiles
    FOR ALL USING (user_id = auth.uid());

-- Student profiles policies
CREATE POLICY "Students can manage their own profile" ON student_profiles
    FOR ALL USING (user_id = auth.uid());

-- Users table policies
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (auth_user_id = auth.uid());

-- ========================================
-- 6. TRIGGERS FOR AUTO-UPDATING ANALYTICS
-- ========================================

-- Function to update student analytics automatically
CREATE OR REPLACE FUNCTION update_student_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update student statistics when quiz_results changes
    UPDATE students 
    SET 
        avg_score = (
            SELECT AVG(score) 
            FROM quiz_results 
            WHERE studentid = NEW.studentid
        ),
        avg_accuracy = (
            SELECT AVG(
                CASE 
                    WHEN total_questions > 0 
                    THEN (correct_answers::DECIMAL / total_questions) * 100 
                    ELSE 0 
                END
            )
            FROM quiz_results 
            WHERE studentid = NEW.studentid
        ),
        avg_time_spent = (
            SELECT AVG(time_spent) 
            FROM quiz_results 
            WHERE studentid = NEW.studentid
        ),
        best_score = (
            SELECT MAX(score) 
            FROM quiz_results 
            WHERE studentid = NEW.studentid
        ),
        lowest_score = (
            SELECT MIN(score) 
            FROM quiz_results 
            WHERE studentid = NEW.studentid
        ),
        quizzes_taken = (
            SELECT COUNT(*) 
            FROM quiz_results 
            WHERE studentid = NEW.studentid
        ),
        updated_at = NOW()
    WHERE user_id = NEW.studentid;
    
    -- Create student record if it doesn't exist
    INSERT INTO students (user_id, avg_score, avg_accuracy, quizzes_taken, best_score, lowest_score)
    SELECT NEW.studentid, NEW.score, 
           CASE WHEN NEW.total_questions > 0 THEN (NEW.correct_answers::DECIMAL / NEW.total_questions) * 100 ELSE 0 END,
           1, NEW.score, NEW.score
    WHERE NOT EXISTS (SELECT 1 FROM students WHERE user_id = NEW.studentid);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_student_analytics ON quiz_results;
CREATE TRIGGER trigger_update_student_analytics
    AFTER INSERT OR UPDATE ON quiz_results
    FOR EACH ROW
    EXECUTE FUNCTION update_student_analytics();

-- ========================================
-- 7. QUIZ_RESULTS TABLE VERIFICATION
-- ========================================

-- Ensure quiz_results table has correct schema
DO $$
BEGIN
    -- Add any missing columns to quiz_results
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quiz_results' AND column_name = 'questions') THEN
        ALTER TABLE quiz_results ADD COLUMN questions JSONB;
    END IF;
    
    -- Add indexes if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'quiz_results' AND indexname = 'idx_quiz_results_studentid') THEN
        CREATE INDEX idx_quiz_results_studentid ON quiz_results(studentid);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'quiz_results' AND indexname = 'idx_quiz_results_quizcode') THEN
        CREATE INDEX idx_quiz_results_quizcode ON quiz_results(quizcode);
    END IF;
END $$;

-- ========================================
-- 8. VERIFICATION QUERIES
-- ========================================

-- Verify all tables exist
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('quizzes', 'quiz_results', 'students', 'faculty_profiles', 'student_profiles', 'users')
ORDER BY tablename;
