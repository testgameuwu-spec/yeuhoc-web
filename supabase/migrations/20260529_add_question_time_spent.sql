-- Store per-question timing for submitted exams and saved practice progress.
-- No index is needed: this JSONB is read with one attempt/progress row, not filtered or sorted.

ALTER TABLE public.exam_attempts
  ADD COLUMN IF NOT EXISTS question_time_spent JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.practice_progress
  ADD COLUMN IF NOT EXISTS question_time_spent JSONB NOT NULL DEFAULT '{}'::jsonb;
