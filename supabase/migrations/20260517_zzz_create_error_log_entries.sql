-- Store each student's saved wrong/unanswered questions for later review.

CREATE TABLE IF NOT EXISTS public.error_log_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  attempt_id UUID,
  exam_key TEXT NOT NULL CHECK (exam_key IN ('THPT', 'HSA', 'TSA')),
  subject TEXT,
  section_label TEXT,
  question_number INTEGER,
  question_type TEXT,
  question_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  context_snapshot JSONB,
  selected_answer JSONB NOT NULL DEFAULT 'null'::jsonb,
  correct_answer JSONB NOT NULL DEFAULT 'null'::jsonb,
  reason TEXT CHECK (
    reason IS NULL OR reason IN (
      'careless',
      'knowledge_gap',
      'misread',
      'time_pressure',
      'other'
    )
  ),
  note TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'exam_result', 'exam_exit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, exam_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_error_log_entries_user_id
  ON public.error_log_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_error_log_entries_exam_filter
  ON public.error_log_entries(user_id, exam_key, subject, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_log_entries_exam_id
  ON public.error_log_entries(exam_id);

DROP TRIGGER IF EXISTS error_log_entries_updated_at ON public.error_log_entries;
CREATE TRIGGER error_log_entries_updated_at
  BEFORE UPDATE ON public.error_log_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.error_log_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own error log entries" ON public.error_log_entries;
CREATE POLICY "Users can view own error log entries"
  ON public.error_log_entries
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own error log entries" ON public.error_log_entries;
CREATE POLICY "Users can insert own error log entries"
  ON public.error_log_entries
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own error log entries" ON public.error_log_entries;
CREATE POLICY "Users can update own error log entries"
  ON public.error_log_entries
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own error log entries" ON public.error_log_entries;
CREATE POLICY "Users can delete own error log entries"
  ON public.error_log_entries
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
