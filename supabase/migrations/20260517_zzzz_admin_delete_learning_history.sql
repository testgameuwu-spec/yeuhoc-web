-- Allow admins to delete learning history records from the admin panel.
-- These policies are no-ops when RLS is disabled, but make the admin UI work
-- in environments where exam_attempts/practice_progress are protected by RLS.

DO $$
BEGIN
  IF to_regclass('public.exam_attempts') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'exam_attempts'
        AND policyname = 'Admins can view all exam attempts'
    ) THEN
      CREATE POLICY "Admins can view all exam attempts"
        ON public.exam_attempts
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role::text = 'admin'
          )
        );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'exam_attempts'
        AND policyname = 'Admins can delete exam attempts'
    ) THEN
      CREATE POLICY "Admins can delete exam attempts"
        ON public.exam_attempts
        FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role::text = 'admin'
          )
        );
    END IF;
  END IF;

  IF to_regclass('public.practice_progress') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'practice_progress'
        AND policyname = 'Admins can delete all practice progress'
    ) THEN
      CREATE POLICY "Admins can delete all practice progress"
        ON public.practice_progress
        FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = (SELECT auth.uid()) AND role::text = 'admin'
          )
        );
    END IF;
  END IF;
END $$;
