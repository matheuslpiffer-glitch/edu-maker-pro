
CREATE TABLE public.student_activity_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_id UUID NOT NULL,
  teacher_user_id UUID NOT NULL,
  student_name TEXT NOT NULL DEFAULT '',
  student_class TEXT NOT NULL DEFAULT '',
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  percentage INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'corrigido',
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  corrections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_activity_results ENABLE ROW LEVEL SECURITY;

-- Teachers can view results for their activities
CREATE POLICY "Teachers can view their activity results"
ON public.student_activity_results
FOR SELECT
TO authenticated
USING (teacher_user_id = auth.uid());

-- Teachers can delete results
CREATE POLICY "Teachers can delete their activity results"
ON public.student_activity_results
FOR DELETE
TO authenticated
USING (teacher_user_id = auth.uid());

-- Allow insert from service role (edge function) - public insert with no auth check since edge function uses service role
CREATE POLICY "Allow public insert for edge function"
ON public.student_activity_results
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
