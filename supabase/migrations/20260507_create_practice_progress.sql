-- Track student progress in practice mode so admins can monitor ongoing study.

CREATE TABLE IF NOT EXISTS public.practice_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  current_question INTEGER NOT NULL DEFAULT 0,
  answered_count INTEGER NOT NULL DEFAULT 0,
  revealed_count INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  bookmarks JSONB NOT NULL DEFAULT '[]'::jsonb,
  revealed_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, exam_id)
);

CREATE INDEX IF NOT EXISTS idx_practice_progress_user_id ON public.practice_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_progress_exam_id ON public.practice_progress(exam_id);
CREATE INDEX IF NOT EXISTS idx_practice_progress_updated_at ON public.practice_progress(updated_at DESC);

ALTER TABLE public.practice_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own practice progress"
  ON public.practice_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own practice progress"
  ON public.practice_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own practice progress"
  ON public.practice_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own practice progress"
  ON public.practice_progress
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all practice progress"
  ON public.practice_progress
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
