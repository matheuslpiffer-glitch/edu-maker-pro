
CREATE TABLE public.question_banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL DEFAULT '',
  topic text NOT NULL DEFAULT '',
  grade text NOT NULL DEFAULT '',
  purpose text NOT NULL DEFAULT 'regular',
  question_type text NOT NULL DEFAULT 'multiple-choice',
  questions jsonb NOT NULL DEFAULT '[]',
  institution_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own question_banks" ON public.question_banks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own question_banks" ON public.question_banks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own question_banks" ON public.question_banks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own question_banks" ON public.question_banks FOR DELETE USING (auth.uid() = user_id);
