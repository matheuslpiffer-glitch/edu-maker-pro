-- Remove broad anonymous access policies for essay submissions
DROP POLICY IF EXISTS "Anon can read essay by access code" ON public.essay_submissions;
DROP POLICY IF EXISTS "Anon can update essay by access code" ON public.essay_submissions;

-- Remove remaining broad policies on questions and results that might still exist
DROP POLICY IF EXISTS "Anon can read questions linked to accessible banks" ON public.questions;
DROP POLICY IF EXISTS "Anon can read results for accessible simulators" ON public.student_results;
DROP POLICY IF EXISTS "Anon can insert results for valid banks" ON public.student_activity_results;
