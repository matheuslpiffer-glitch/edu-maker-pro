-- Public anon SELECT for questions table
CREATE POLICY "Public read questions for students"
ON public.questions FOR SELECT TO anon
USING (true);

-- Public anon SELECT for student_activity_results
CREATE POLICY "Public read student_activity_results"
ON public.student_activity_results FOR SELECT TO anon
USING (true);