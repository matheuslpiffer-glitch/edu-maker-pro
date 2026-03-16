
-- Table to store individual student results for each simulator
CREATE TABLE public.student_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  simulator_id uuid NOT NULL REFERENCES public.simulators(id) ON DELETE CASCADE,
  student_name text NOT NULL DEFAULT '',
  correct_count integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  percentage numeric(5,2) NOT NULL DEFAULT 0,
  proficiency_level text NOT NULL DEFAULT 'abaixo_basico',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own results" ON public.student_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own results" ON public.student_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own results" ON public.student_results FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own results" ON public.student_results FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_student_results_simulator ON public.student_results(simulator_id);
