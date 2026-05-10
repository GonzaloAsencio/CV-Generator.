-- Add cv_text column to user_profiles for storing full CV content
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS cv_text text;
