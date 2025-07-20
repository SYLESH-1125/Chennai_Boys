-- Check quiz_results table structure
-- Run this in your Supabase SQL editor or database client

-- 1. Get table structure with column details
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'quiz_results' 
ORDER BY ordinal_position;

-- 2. Get table constraints (primary keys, foreign keys, etc.)
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'quiz_results';

-- 3. Check if quiz_results table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'quiz_results'
) AS table_exists;

-- 4. Get sample data (first 5 records) to understand the data structure
SELECT * FROM quiz_results LIMIT 5;

-- 5. Count total records in quiz_results
SELECT COUNT(*) as total_records FROM quiz_results;

-- 6. Check for any indexes on the table
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'quiz_results';

-- 7. Alternative: Use PostgreSQL's describe table equivalent
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'quiz_results'
    AND table_schema = 'public'
ORDER BY ordinal_position;
