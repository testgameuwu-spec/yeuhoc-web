-- Restrict question report management to admins only.

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
      WHERE profiles.id = auth.uid()
    ),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.question_reports') IS NOT NULL THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Admins can manage all reports" ON public.question_reports
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "Admins can manage all reports"
        ON public.question_reports
        FOR ALL
        TO authenticated
        USING (public.current_user_is_admin())
        WITH CHECK (public.current_user_is_admin())
    $policy$;
  END IF;
END;
$$;
