-- Store elapsed practice time for resume/history displays.

ALTER TABLE public.practice_progress
  ADD COLUMN IF NOT EXISTS time_spent INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'practice_progress_time_spent_nonnegative'
      AND conrelid = 'public.practice_progress'::regclass
  ) THEN
    ALTER TABLE public.practice_progress
      ADD CONSTRAINT practice_progress_time_spent_nonnegative CHECK (time_spent >= 0);
  END IF;
END $$;
