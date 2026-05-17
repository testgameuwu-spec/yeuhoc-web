-- Metadata-only AI usage logs for admin analytics.

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('practice_chat', 'notification_draft')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
  question_id TEXT,
  request_type TEXT,
  model TEXT,
  prompt_tokens INTEGER NOT NULL DEFAULT 0 CHECK (prompt_tokens >= 0),
  completion_tokens INTEGER NOT NULL DEFAULT 0 CHECK (completion_tokens >= 0),
  total_tokens INTEGER NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at
  ON public.ai_usage_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_source_created_at
  ON public.ai_usage_logs(source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_created_at
  ON public.ai_usage_logs(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_exam_created_at
  ON public.ai_usage_logs(exam_id, created_at DESC)
  WHERE exam_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_status_created_at
  ON public.ai_usage_logs(status, created_at DESC);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read ai usage logs" ON public.ai_usage_logs;
CREATE POLICY "Admins can read ai usage logs"
  ON public.ai_usage_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

-- Server routes write through the service role key. No authenticated write policy is exposed.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_usage_logs;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END;
$$;
