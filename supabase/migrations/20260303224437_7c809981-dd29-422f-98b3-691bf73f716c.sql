
-- Create simulators table
CREATE TABLE public.simulators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_type text NOT NULL DEFAULT 'saresp',
  title text NOT NULL DEFAULT '',
  institution_name text NOT NULL DEFAULT '',
  student_fields jsonb NOT NULL DEFAULT '{}',
  questions jsonb NOT NULL DEFAULT '[]',
  answer_key jsonb NOT NULL DEFAULT '[]',
  skill_codes text[] NOT NULL DEFAULT '{}',
  grade text NOT NULL DEFAULT '',
  subject_area text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.simulators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own simulators" ON public.simulators FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own simulators" ON public.simulators FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own simulators" ON public.simulators FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own simulators" ON public.simulators FOR DELETE USING (auth.uid() = user_id);
