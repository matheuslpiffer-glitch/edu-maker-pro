
-- Table for essay submissions (typed essays by students)
CREATE TABLE public.essay_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  proposal_theme TEXT NOT NULL DEFAULT '',
  banca TEXT NOT NULL DEFAULT 'ENEM',
  student_name TEXT NOT NULL DEFAULT '',
  student_class TEXT NOT NULL DEFAULT '',
  essay_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  scores JSONB DEFAULT '{}',
  suggestions TEXT DEFAULT '',
  repertoire_analysis TEXT DEFAULT '',
  total_score NUMERIC DEFAULT 0,
  corrected_at TIMESTAMPTZ,
  teacher_validated BOOLEAN DEFAULT false,
  teacher_notes TEXT DEFAULT '',
  access_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generate unique access code
CREATE OR REPLACE FUNCTION public.generate_essay_access_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.essay_submissions WHERE access_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  NEW.access_code := new_code;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_essay_access_code
  BEFORE INSERT ON public.essay_submissions
  FOR EACH ROW EXECUTE FUNCTION public.generate_essay_access_code();

-- Update timestamp trigger
CREATE TRIGGER set_essay_updated_at
  BEFORE UPDATE ON public.essay_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_generation_jobs_updated_at();

-- Enable RLS
ALTER TABLE public.essay_submissions ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own submissions
CREATE POLICY "Teachers manage own essay submissions"
  ON public.essay_submissions FOR ALL
  TO authenticated
  USING (teacher_user_id = auth.uid())
  WITH CHECK (teacher_user_id = auth.uid());

-- Anonymous/students can read by access_code
CREATE POLICY "Anyone can read by access code"
  ON public.essay_submissions FOR SELECT
  TO anon, authenticated
  USING (access_code IS NOT NULL);

-- Anonymous/students can update essay_text and status for submissions
CREATE POLICY "Students can submit essays"
  ON public.essay_submissions FOR UPDATE
  TO anon, authenticated
  USING (access_code IS NOT NULL)
  WITH CHECK (access_code IS NOT NULL);
