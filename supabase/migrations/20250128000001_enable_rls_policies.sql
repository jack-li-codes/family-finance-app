-- =====================================================
-- Enable Row Level Security (RLS) on All Tables
-- =====================================================
-- This migration enables RLS and creates policies to ensure
-- users can only access their own data (user_id = auth.uid())

-- =====================================================
-- 1. ACCOUNTS TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can insert their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete their own accounts" ON accounts;

-- SELECT: Users can view only their own accounts
CREATE POLICY "Users can view their own accounts"
ON accounts
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Users can only insert accounts with their own user_id
CREATE POLICY "Users can insert their own accounts"
ON accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own accounts
CREATE POLICY "Users can update their own accounts"
ON accounts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own accounts
CREATE POLICY "Users can delete their own accounts"
ON accounts
FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- 2. TRANSACTIONS TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

-- SELECT: Users can view only their own transactions
CREATE POLICY "Users can view their own transactions"
ON transactions
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Users can only insert transactions with their own user_id
CREATE POLICY "Users can insert their own transactions"
ON transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own transactions
CREATE POLICY "Users can update their own transactions"
ON transactions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own transactions
CREATE POLICY "Users can delete their own transactions"
ON transactions
FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- 3. PROJECTS TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- SELECT: Users can view only their own projects
CREATE POLICY "Users can view their own projects"
ON projects
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Users can only insert projects with their own user_id
CREATE POLICY "Users can insert their own projects"
ON projects
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own projects
CREATE POLICY "Users can update their own projects"
ON projects
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own projects
CREATE POLICY "Users can delete their own projects"
ON projects
FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- 4. WORKLOGS TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE worklogs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view their own worklogs" ON worklogs;
DROP POLICY IF EXISTS "Users can insert their own worklogs" ON worklogs;
DROP POLICY IF EXISTS "Users can update their own worklogs" ON worklogs;
DROP POLICY IF EXISTS "Users can delete their own worklogs" ON worklogs;

-- SELECT: Users can view only their own worklogs
CREATE POLICY "Users can view their own worklogs"
ON worklogs
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Users can only insert worklogs with their own user_id
CREATE POLICY "Users can insert their own worklogs"
ON worklogs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own worklogs
CREATE POLICY "Users can update their own worklogs"
ON worklogs
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own worklogs
CREATE POLICY "Users can delete their own worklogs"
ON worklogs
FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- VERIFICATION QUERIES (for testing in Supabase SQL Editor)
-- =====================================================
-- Uncomment these to verify RLS is enabled:

-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('accounts', 'transactions', 'projects', 'worklogs');

-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('accounts', 'transactions', 'projects', 'worklogs')
-- ORDER BY tablename, policyname;
