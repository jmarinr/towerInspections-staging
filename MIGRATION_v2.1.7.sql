-- Migration: Allow multiple submissions per form per device (one per order)
-- Run this in Supabase SQL Editor

-- Step 1: Make site_visit_id NOT NULL with a default for existing rows
UPDATE submissions SET site_visit_id = '00000000-0000-0000-0000-000000000000' WHERE site_visit_id IS NULL;

-- Step 2: Set default for future rows without site_visit_id
ALTER TABLE submissions ALTER COLUMN site_visit_id SET DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE submissions ALTER COLUMN site_visit_id SET NOT NULL;

-- Step 3: Drop the old constraint
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_unique_device_form;

-- Step 4: Drop the COALESCE index if it was created before
DROP INDEX IF EXISTS submissions_unique_device_form_visit;

-- Step 5: Create new proper unique constraint including site_visit_id
ALTER TABLE submissions ADD CONSTRAINT submissions_unique_device_form_visit 
  UNIQUE (org_code, device_id, form_code, site_visit_id);
