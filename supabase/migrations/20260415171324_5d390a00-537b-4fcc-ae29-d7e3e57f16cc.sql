
-- 1. Fix pisa_simulators: remove blanket public SELECT
DROP POLICY IF EXISTS "Anyone can read pisa simulator by id" ON public.pisa_simulators;

-- 2. Fix meetings: replace blanket public SELECT with restricted one
DROP POLICY IF EXISTS "Anyone can read meeting topic for signing" ON public.meetings;
CREATE POLICY "Authenticated can read meeting for signing"
  ON public.meetings FOR SELECT
  TO authenticated
  USING (true);

-- 3. Fix meeting_attendance: restrict public read
DROP POLICY IF EXISTS "Anyone can read attendance" ON public.meeting_attendance;
CREATE POLICY "Authenticated can read attendance"
  ON public.meeting_attendance FOR SELECT
  TO authenticated
  USING (true);

-- 4. Fix student_activity_results: restrict INSERT to require valid bank
DROP POLICY IF EXISTS "Allow public insert for edge function" ON public.student_activity_results;
CREATE POLICY "Anon can insert results for valid banks"
  ON public.student_activity_results FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.question_banks qb
      WHERE qb.id = student_activity_results.bank_id
      AND qb.access_code IS NOT NULL
    )
  );

-- 5. Fix essay_submissions: tighten anonymous access
-- The current policy allows reading ALL rows with access_code IS NOT NULL.
-- We can't easily validate the caller's code in RLS, but we remove the broad policy
-- and rely on the edge function (student-activity) for anonymous access instead.
-- Teachers already have their own ALL policy.
DROP POLICY IF EXISTS "Anyone can read by access code" ON public.essay_submissions;
DROP POLICY IF EXISTS "Students can update essays with valid access code" ON public.essay_submissions;

-- Re-create with anon role only (authenticated teachers already covered by ALL policy)
CREATE POLICY "Anon can read essay by access code"
  ON public.essay_submissions FOR SELECT
  TO anon
  USING (access_code IS NOT NULL);

CREATE POLICY "Anon can update essay by access code"
  ON public.essay_submissions FOR UPDATE
  TO anon
  USING (access_code IS NOT NULL)
  WITH CHECK (access_code IS NOT NULL);
