ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS profile_data jsonb;
