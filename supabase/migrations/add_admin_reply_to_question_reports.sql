-- Add anonymous admin reply fields for question reports
ALTER TABLE question_reports
  ADD COLUMN IF NOT EXISTS admin_reply TEXT,
  ADD COLUMN IF NOT EXISTS admin_replied_at TIMESTAMPTZ;
