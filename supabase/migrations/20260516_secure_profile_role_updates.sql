-- Prevent normal users from changing security-sensitive profile fields.

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

CREATE OR REPLACE FUNCTION public.protect_profile_security_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  protected_fields_changed BOOLEAN;
BEGIN
  protected_fields_changed :=
    (to_jsonb(OLD) -> 'role') IS DISTINCT FROM (to_jsonb(NEW) -> 'role')
    OR (to_jsonb(OLD) -> 'is_banned') IS DISTINCT FROM (to_jsonb(NEW) -> 'is_banned');

  IF protected_fields_changed THEN
    IF auth.uid() IS NULL OR auth.role() = 'service_role' OR public.current_user_is_admin() THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Only admins can update protected profile fields'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_security_fields ON public.profiles;
CREATE TRIGGER protect_profile_security_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_security_fields();

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin());
