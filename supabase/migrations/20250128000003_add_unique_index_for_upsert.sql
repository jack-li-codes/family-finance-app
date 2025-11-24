-- Add unique index on (user_id, name) for upsert operations
-- This enables the "Import Template" feature to work properly
-- Run this if you already applied the initial fixed_expenses migration

-- Create unique index for upsert by name (within each user's records)
CREATE UNIQUE INDEX IF NOT EXISTS idx_fixed_expenses_user_name
  ON public.fixed_expenses(user_id, name);

-- Verify index creation
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'fixed_expenses'
  AND indexname = 'idx_fixed_expenses_user_name';

COMMENT ON INDEX public.idx_fixed_expenses_user_name IS
  'Unique index on (user_id, name) to enable upsert operations for template import feature';
