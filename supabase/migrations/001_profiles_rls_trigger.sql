-- ============================================================
-- YeuHoc — Supabase Migration: Profiles, RLS, Trigger & Seed
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ─── 1. Create custom ENUM type for user roles ──────────────
CREATE TYPE public.user_role AS ENUM ('admin', 'user');


-- ─── 2. Create profiles table (extends auth.users) ─────────
CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT UNIQUE,
  full_name  TEXT,
  avatar_url TEXT,
  bio        TEXT,
  role       public.user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Add a comment for documentation
COMMENT ON TABLE public.profiles IS 'Extended user profiles linked to auth.users';


-- ─── 3. Enable Row Level Security (RLS) ────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update all profiles (e.g. change roles)
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Allow insert during signup (trigger runs as SECURITY DEFINER)
CREATE POLICY "Enable insert for service role"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ─── 4. Auto-create profile on new user signup ─────────────

-- Function: called by trigger after a new auth.users row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER          -- runs with elevated privileges
SET search_path = public  -- protect against search_path attacks
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'username',
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name'
    ),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger: fires after each new signup in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ─── 5. Auto-update `updated_at` timestamp ──────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();


-- ─── 6. Seed Data: Sample Admin & User ──────────────────────
-- NOTE: Replace the UUIDs below with the actual UUIDs from auth.users
-- after creating accounts via Supabase Auth (Dashboard or API).
--
-- Example: After you create users in Supabase Auth Dashboard,
-- run the following with the correct UUIDs:
--
-- INSERT INTO public.profiles (id, username, full_name, avatar_url, role)
-- VALUES
--   (
--     'REPLACE-WITH-ADMIN-UUID',
--     'admin_yeuhoc',
--     'Admin YeuHoc',
--     NULL,
--     'admin'
--   ),
--   (
--     'REPLACE-WITH-USER-UUID',
--     'user_demo',
--     'Người dùng mẫu',
--     NULL,
--     'user'
--   );

-- ─── Quick method: Promote an existing user to admin ────────
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE username = 'admin_yeuhoc';

-- ============================================================
-- Done! Your profiles system is ready.
-- ============================================================
