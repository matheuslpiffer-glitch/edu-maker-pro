CREATE TABLE IF NOT EXISTS public.user_pedagogical_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'estilo',
  memory_fact text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_pedagogical_memory ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'estilo';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_pedagogical_memory TO authenticated;
GRANT ALL ON public.user_pedagogical_memory TO service_role;
ALTER TABLE public.user_pedagogical_memory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own memory" ON public.user_pedagogical_memory;
CREATE POLICY "Own memory" ON public.user_pedagogical_memory FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_upm_user ON public.user_pedagogical_memory(user_id, created_at DESC);

CREATE TABLE public.mat_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mat_documents TO authenticated;
GRANT ALL ON public.mat_documents TO service_role;
ALTER TABLE public.mat_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own documents" ON public.mat_documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_mat_docs_user ON public.mat_documents(user_id, created_at DESC);