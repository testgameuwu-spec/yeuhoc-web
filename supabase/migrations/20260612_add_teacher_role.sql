-- Allow teacher role on profiles (enum + check constraint)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'user_role'
      AND n.nspname = 'public'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'teacher';
  END IF;
END $$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role::text = ANY (ARRAY['admin'::text, 'user'::text, 'teacher'::text]));
