-- Migration: Allow multiple submissions per form per device (one per order)
-- Run this in Supabase SQL Editor

-- 1. Drop the old constraint
ALTER TABLE submissions 
DROP CONSTRAINT IF EXISTS submissions_unique_device_form;

-- 2. Create new constraint that includes site_visit_id
-- This allows: same device + same form + different orders = separate rows
-- For submissions without an order (site_visit_id IS NULL), 
-- we use COALESCE to treat NULL as a fixed value
CREATE UNIQUE INDEX submissions_unique_device_form_visit 
ON submissions (org_code, device_id, form_code, COALESCE(site_visit_id, '00000000-0000-0000-0000-000000000000'));

