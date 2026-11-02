-- Issue #35: Campaign verification and rejection reason

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
