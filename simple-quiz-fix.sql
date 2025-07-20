-- Simple fix: Add quiz_history column to students table
-- Run this in your Supabase SQL Editor

ALTER TABLE students ADD COLUMN IF NOT EXISTS quiz_history JSONB DEFAULT '[]'::JSONB;
