ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS mentioned_exam_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];

CREATE INDEX IF NOT EXISTS idx_notifications_mentioned_exam_ids
  ON public.notifications USING GIN (mentioned_exam_ids);
