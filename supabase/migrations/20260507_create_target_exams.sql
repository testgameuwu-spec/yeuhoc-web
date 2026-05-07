-- Manage user target exams for the home greeting countdown.

CREATE TABLE IF NOT EXISTS public.target_exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT target_exams_name_exam_date_unique UNIQUE (name, exam_date)
);

CREATE TABLE IF NOT EXISTS public.user_exam_targets (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_exam_id UUID NOT NULL REFERENCES public.target_exams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, target_exam_id)
);

CREATE INDEX IF NOT EXISTS idx_target_exams_exam_date ON public.target_exams(exam_date);
CREATE INDEX IF NOT EXISTS idx_target_exams_is_active ON public.target_exams(is_active);
CREATE INDEX IF NOT EXISTS idx_user_exam_targets_target_exam_id ON public.user_exam_targets(target_exam_id);

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_target_exam(check_target_exam_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_exam_targets
    WHERE user_exam_targets.user_id = auth.uid()
      AND user_exam_targets.target_exam_id = check_target_exam_id
  );
$$;

CREATE OR REPLACE FUNCTION public.target_exam_is_active(check_target_exam_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.target_exams
    WHERE target_exams.id = check_target_exam_id
      AND target_exams.is_active = TRUE
  );
$$;

DROP TRIGGER IF EXISTS target_exams_updated_at ON public.target_exams;
CREATE TRIGGER target_exams_updated_at
  BEFORE UPDATE ON public.target_exams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS user_exam_targets_updated_at ON public.user_exam_targets;
CREATE TRIGGER user_exam_targets_updated_at
  BEFORE UPDATE ON public.user_exam_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.target_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_exam_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active and selected target exams" ON public.target_exams;
CREATE POLICY "Users can view active and selected target exams"
  ON public.target_exams
  FOR SELECT
  TO authenticated
  USING (
    is_active
    OR public.current_user_has_target_exam(id)
    OR public.is_current_user_admin()
  );

DROP POLICY IF EXISTS "Admins can manage target exams" ON public.target_exams;
CREATE POLICY "Admins can manage target exams"
  ON public.target_exams
  FOR ALL
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Users can view own exam targets" ON public.user_exam_targets;
CREATE POLICY "Users can view own exam targets"
  ON public.user_exam_targets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own active exam targets" ON public.user_exam_targets;
CREATE POLICY "Users can insert own active exam targets"
  ON public.user_exam_targets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.target_exam_is_active(target_exam_id)
  );

DROP POLICY IF EXISTS "Users can delete own exam targets" ON public.user_exam_targets;
CREATE POLICY "Users can delete own exam targets"
  ON public.user_exam_targets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all user exam targets" ON public.user_exam_targets;
CREATE POLICY "Admins can manage all user exam targets"
  ON public.user_exam_targets
  FOR ALL
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());
