
-- Table for BNCC / SEDUC-SP curriculum skills (Escopo e Sequência)
CREATE TABLE public.curriculum_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  description text NOT NULL,
  subject_area text NOT NULL,
  grade text NOT NULL,
  stage text NOT NULL DEFAULT 'fundamental_ii',
  bimester integer NOT NULL DEFAULT 1,
  knowledge_object text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Public read access (curriculum is shared data)
ALTER TABLE public.curriculum_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read curriculum skills"
ON public.curriculum_skills FOR SELECT
TO authenticated
USING (true);

-- Only super_admin can manage
CREATE POLICY "Super admins can manage curriculum skills"
ON public.curriculum_skills FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Index for search
CREATE INDEX idx_curriculum_skills_search ON public.curriculum_skills USING gin(to_tsvector('portuguese', code || ' ' || description || ' ' || knowledge_object));
CREATE INDEX idx_curriculum_skills_filter ON public.curriculum_skills (subject_area, grade, stage, bimester);
