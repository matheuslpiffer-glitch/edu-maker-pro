-- Allow anonymous users to read question_banks (for student activity links)
CREATE POLICY "Public read question_banks for students"
ON public.question_banks
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to read simulators (for student links)
CREATE POLICY "Public read simulators for students"
ON public.simulators
FOR SELECT
TO anon
USING (true);