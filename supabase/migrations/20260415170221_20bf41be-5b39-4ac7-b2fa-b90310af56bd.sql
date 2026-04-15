
-- 1. FIX: user_roles privilege escalation - restrict self-assignable roles
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
CREATE POLICY "Users can insert their own role (restricted)"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role IN ('user'::app_role, 'student'::app_role)
  );

-- 2. FIX: student_activity_results - remove broad anonymous SELECT
DROP POLICY IF EXISTS "Public read student_activity_results" ON public.student_activity_results;

-- 3. FIX: student_results - remove broad anonymous SELECT and INSERT
DROP POLICY IF EXISTS "Public read student_results for students" ON public.student_results;
DROP POLICY IF EXISTS "Public insert student_results for students" ON public.student_results;

-- Replace with scoped anonymous INSERT (students submit results for a specific simulator)
CREATE POLICY "Anon can insert results for accessible simulators"
  ON public.student_results FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.simulators s
      WHERE s.id = simulator_id AND s.access_code IS NOT NULL
    )
  );

-- Allow anon SELECT only for results tied to a simulator with access_code
CREATE POLICY "Anon can read results for accessible simulators"
  ON public.student_results FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.simulators s
      WHERE s.id = simulator_id AND s.access_code IS NOT NULL
    )
  );

-- 4. FIX: essay_submissions - tighten anonymous UPDATE
DROP POLICY IF EXISTS "Students can submit essays" ON public.essay_submissions;
CREATE POLICY "Students can update essays with valid access code"
  ON public.essay_submissions FOR UPDATE
  TO anon, authenticated
  USING (access_code IS NOT NULL)
  WITH CHECK (access_code IS NOT NULL);

-- 5. FIX: question_banks - restrict anon SELECT to hide answer content  
DROP POLICY IF EXISTS "Public read question_banks for students" ON public.question_banks;
CREATE POLICY "Anon can read question_banks with access code"
  ON public.question_banks FOR SELECT
  TO anon
  USING (access_code IS NOT NULL);

-- 6. FIX: simulators - restrict anon SELECT to those with access codes
DROP POLICY IF EXISTS "Public read simulators for students" ON public.simulators;
CREATE POLICY "Anon can read simulators with access code"
  ON public.simulators FOR SELECT
  TO anon
  USING (access_code IS NOT NULL);

-- 7. FIX: questions - restrict anon SELECT (students access via question_banks)
DROP POLICY IF EXISTS "Public read questions for students" ON public.questions;
CREATE POLICY "Anon can read questions linked to accessible banks"
  ON public.questions FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.question_banks qb
      WHERE qb.access_code IS NOT NULL
      AND qb.questions::text LIKE '%' || questions.id::text || '%'
    )
  );
