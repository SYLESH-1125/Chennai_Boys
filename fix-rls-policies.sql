-- =====================================================
-- FIX RLS POLICIES TO ALLOW FACULTY ACCESS TO STUDENT DATA
-- =====================================================

-- The issue: Faculty can't see student quiz_history due to restrictive RLS policies
-- Current policy: "Students can view their own profile" (id = auth.uid())
-- Solution: Add policies that allow faculty to view student data

-- 1. First, check what user roles/types exist in your system
SELECT DISTINCT 
    id,
    email,
    raw_user_meta_data->>'role' as user_role,
    raw_user_meta_data
FROM auth.users 
ORDER BY email;

-- 2. Create a policy that allows faculty to view student data
-- This assumes faculty users have a 'role' field in their metadata or a separate faculty table

-- Option A: If you have user roles in auth.users metadata
CREATE POLICY "Faculty can view all students" ON students
    FOR SELECT
    USING (
        auth.jwt() ->> 'role' = 'faculty' 
        OR 
        (SELECT auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'faculty'
        OR
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data ->> 'role' = 'faculty'
        )
    );

-- Option B: If you have a separate faculty/users table with role information
-- (Uncomment if you have a users table with role column)
/*
CREATE POLICY "Faculty can view all students for analytics" ON students
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'faculty'
        )
    );
*/

-- Option C: If faculty are identified by email pattern or specific table
-- (Uncomment and modify if you have a faculty table)
/*
CREATE POLICY "Faculty can view all students" ON students
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM faculty 
            WHERE user_id = auth.uid()
        )
    );
*/

-- 3. Alternative: Temporarily allow broader access for testing
-- WARNING: This is less secure, use only for testing
/*
DROP POLICY IF EXISTS "Students can view their own profile" ON students;
CREATE POLICY "Allow authenticated users to view students" ON students
    FOR SELECT
    USING (auth.role() = 'authenticated');
*/

-- 4. Check current policies after changes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'students'
ORDER BY policyname;

-- 5. Test query that faculty dashboard would make (run this to test if the policy works)
-- This should return student data if the policy is working
SELECT 
    id,
    full_name,
    email,
    jsonb_array_length(COALESCE(quiz_history, '[]'::jsonb)) as quiz_count
FROM students 
WHERE quiz_history IS NOT NULL 
  AND jsonb_array_length(quiz_history) > 0
LIMIT 3;
