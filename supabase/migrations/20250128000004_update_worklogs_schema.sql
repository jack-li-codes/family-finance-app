-- Add is_holiday column to worklogs table
ALTER TABLE worklogs
ADD COLUMN IF NOT EXISTS is_holiday BOOLEAN DEFAULT FALSE;

-- Drop NOT NULL constraints from time-related and note fields
ALTER TABLE worklogs
ALTER COLUMN start_time DROP NOT NULL,
ALTER COLUMN end_time DROP NOT NULL,
ALTER COLUMN hours DROP NOT NULL,
ALTER COLUMN location DROP NOT NULL,
ALTER COLUMN note DROP NOT NULL;
