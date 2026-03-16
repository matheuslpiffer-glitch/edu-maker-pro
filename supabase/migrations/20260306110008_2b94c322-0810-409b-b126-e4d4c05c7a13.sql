
CREATE TABLE public.pisa_simulators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  proficiency_level integer NOT NULL DEFAULT 3,
  competency text NOT NULL DEFAULT 'letramento_matematico',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  student_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pisa_simulators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pisa simulators" ON public.pisa_simulators FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own pisa simulators" ON public.pisa_simulators FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own pisa simulators" ON public.pisa_simulators FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pisa simulators" ON public.pisa_simulators FOR DELETE USING (auth.uid() = user_id);
