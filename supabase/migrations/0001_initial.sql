-- ================================================================
-- CV Tailor AI — Migration 0001: initial schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------
-- user_profiles
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_uploaded_at timestamptz,
  cv_chunks_count integer DEFAULT 0,
  cv_storage_path text,
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own profile"
  ON public.user_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- cv_chunks
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cv_chunks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text NOT NULL,
  embedding   vector(768) NOT NULL,
  chunk_index integer NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cv_chunks_user_id
  ON public.cv_chunks USING btree (user_id);

ALTER TABLE public.cv_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own chunks"
  ON public.cv_chunks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- generated_cvs
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.generated_cvs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_snapshot jsonb NOT NULL,
  job_offer_snippet text NOT NULL,
  cv_data          jsonb NOT NULL,
  chunks_used      integer,
  top_similarity   float,
  idempotency_key  text,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_cvs_user_created
  ON public.generated_cvs USING btree (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS unique_generated_cvs_idempotency
  ON public.generated_cvs (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.generated_cvs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own generated cvs"
  ON public.generated_cvs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own generated cvs"
  ON public.generated_cvs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- generated_speeches
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.generated_speeches (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_snapshot jsonb NOT NULL,
  generated_cv_id  uuid REFERENCES public.generated_cvs(id) ON DELETE SET NULL,
  speech_data      jsonb NOT NULL,
  idempotency_key  text,
  created_at       timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_generated_speeches_idempotency
  ON public.generated_speeches (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.generated_speeches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own generated speeches"
  ON public.generated_speeches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own generated speeches"
  ON public.generated_speeches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- llm_calls  (audit log)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.llm_calls (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('cv', 'speech')),
  prompt      text NOT NULL,
  response    text,
  parsed_ok   boolean NOT NULL,
  retry_count integer DEFAULT 0,
  latency_ms  integer NOT NULL,
  error       text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.llm_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own llm calls"
  ON public.llm_calls FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own llm calls"
  ON public.llm_calls FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- match_cv_chunks  (similarity search)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_cv_chunks(
  query_embedding vector(768),
  match_threshold float,
  match_count     int,
  p_user_id       uuid
)
RETURNS TABLE (id uuid, content text, similarity float)
LANGUAGE sql STABLE
AS $$
  SELECT id, content,
         1 - (embedding <=> query_embedding) AS similarity
  FROM   public.cv_chunks
  WHERE  user_id = p_user_id
    AND  1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ----------------------------------------------------------------
-- Storage: RLS policy for bucket "cvs"  (privado)
-- Prerequisite: bucket "cvs" must exist (create it in Dashboard)
-- ----------------------------------------------------------------
CREATE POLICY "users manage own cv files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
