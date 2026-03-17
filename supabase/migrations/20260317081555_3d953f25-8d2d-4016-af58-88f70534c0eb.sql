CREATE POLICY "Public insert student_results for students"
ON public.student_results FOR INSERT TO anon
WITH CHECK (true);

CREATE POLICY "Public read student_results for students"
ON public.student_results FOR SELECT TO anon
USING (true);