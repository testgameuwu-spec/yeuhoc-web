-- Track how many times saved error-log questions are retried.

ALTER TABLE public.error_log_entries
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.error_log_entries
  ADD COLUMN IF NOT EXISTS last_retried_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'error_log_entries_retry_count_nonnegative'
      AND conrelid = 'public.error_log_entries'::regclass
  ) THEN
    ALTER TABLE public.error_log_entries
      ADD CONSTRAINT error_log_entries_retry_count_nonnegative
      CHECK (retry_count >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_error_log_entries_unretried_filter
  ON public.error_log_entries(user_id, exam_key, subject, exam_id)
  WHERE retry_count = 0;

CREATE OR REPLACE FUNCTION public.increment_error_log_retry_counts(entry_ids UUID[])
RETURNS TABLE (
  id UUID,
  retry_count INTEGER,
  last_retried_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.error_log_entries
  SET
    retry_count = public.error_log_entries.retry_count + 1,
    last_retried_at = now()
  WHERE public.error_log_entries.user_id = (SELECT auth.uid())
    AND public.error_log_entries.id = ANY(COALESCE(entry_ids, ARRAY[]::UUID[]))
  RETURNING
    public.error_log_entries.id,
    public.error_log_entries.retry_count,
    public.error_log_entries.last_retried_at,
    public.error_log_entries.updated_at;
$$;

REVOKE ALL ON FUNCTION public.increment_error_log_retry_counts(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_error_log_retry_counts(UUID[]) TO authenticated;
