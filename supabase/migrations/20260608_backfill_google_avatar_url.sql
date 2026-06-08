-- Backfill profile avatars from Google OAuth metadata, then keep it for new users.

UPDATE public.profiles AS p
SET avatar_url = COALESCE(
  u.raw_user_meta_data ->> 'avatar_url',
  u.raw_user_meta_data ->> 'picture',
  u.raw_user_meta_data ->> 'photo_url'
)
FROM auth.users AS u
WHERE p.id = u.id
  AND (p.avatar_url IS NULL OR btrim(p.avatar_url) = '')
  AND (
    u.raw_user_meta_data ? 'avatar_url'
    OR u.raw_user_meta_data ? 'picture'
    OR u.raw_user_meta_data ? 'photo_url'
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',
      NEW.raw_user_meta_data ->> 'picture',
      NEW.raw_user_meta_data ->> 'photo_url'
    )
  );
  RETURN NEW;
END;
$$;
