-- Home notifications and per-user seen state.

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT profiles.role::text = 'admin'
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
    ),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  video_url TEXT,
  video_poster_url TEXT,
  media_alt TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notifications_title_not_blank CHECK (length(btrim(title)) > 0)
);

CREATE TABLE IF NOT EXISTS public.notification_reads (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, notification_id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_is_published ON public.notifications(is_published);
CREATE INDEX IF NOT EXISTS idx_notifications_published_at ON public.notifications(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_published_recent
  ON public.notifications(published_at DESC, id)
  WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON public.notifications(created_by);
CREATE INDEX IF NOT EXISTS idx_notification_reads_notification_id ON public.notification_reads(notification_id);

DROP TRIGGER IF EXISTS notifications_updated_at ON public.notifications;
CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view published notifications" ON public.notifications;
CREATE POLICY "Users can view published notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (is_published = TRUE);

DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Admins can manage notifications"
  ON public.notifications
  FOR ALL
  TO authenticated
  USING ((SELECT public.current_user_is_admin()))
  WITH CHECK ((SELECT public.current_user_is_admin()));

DROP POLICY IF EXISTS "Users can view own notification reads" ON public.notification_reads;
CREATE POLICY "Users can view own notification reads"
  ON public.notification_reads
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own notification reads" ON public.notification_reads;
CREATE POLICY "Users can insert own notification reads"
  ON public.notification_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.notifications
      WHERE notifications.id = notification_id
        AND notifications.is_published = TRUE
    )
  );

DROP POLICY IF EXISTS "Users can update own notification reads" ON public.notification_reads;
CREATE POLICY "Users can update own notification reads"
  ON public.notification_reads
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DO $$
BEGIN
  IF to_regclass('public.exams') IS NOT NULL THEN
    ALTER TABLE public.exams
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    DROP TRIGGER IF EXISTS exams_updated_at ON public.exams;
    CREATE TRIGGER exams_updated_at
      BEFORE UPDATE ON public.exams
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF to_regclass('public.folders') IS NOT NULL THEN
    ALTER TABLE public.folders
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    DROP TRIGGER IF EXISTS folders_updated_at ON public.folders;
    CREATE TRIGGER folders_updated_at
      BEFORE UPDATE ON public.folders
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END;
$$;
