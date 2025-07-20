-- =====================================================
-- QUICK FIX: ALLOW FACULTY TO VIEW STUDENT DATA
-- =====================================================

-- IMMEDIATE SOLUTION: Modify the existing "Allow all reads" policy to work properly
-- or create a new policy for faculty access

-- Option 1: Simple fix - Allow all authenticated users to read student data
-- This is the safest immediate fix
DROP POLICY IF EXISTS "Allow all reads" ON students;
CREATE POLICY "Allow all authenticated reads" ON students
    FOR SELECT
    TO authenticated
    USING (true);

-- Option 2: If the above doesn't work, you can temporarily disable RLS for testing
-- WARNING: Only use this temporarily for testing
-- ALTER TABLE students DISABLE ROW LEVEL SECURITY;

-- After applying the fix, test with this query:
SELECT 
    COUNT(*) as total_students,
    COUNT(CASE WHEN quiz_history IS NOT NULL AND jsonb_array_length(quiz_history) > 0 THEN 1 END) as students_with_quiz_data
FROM students;
