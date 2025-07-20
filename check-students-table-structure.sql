-- Check students table structure to see actual column names
-- Run this in your Supabase SQL editor

-- 1. Get students table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'students' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if students table exists and get sample data
SELECT * FROM students LIMIT 3;

-- 3. Check what name-related columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'students' 
    AND column_name ILIKE '%name%';

-- 4. Get all column names for students table
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'students' 
ORDER BY ordinal_position;
