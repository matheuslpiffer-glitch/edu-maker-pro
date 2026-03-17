-- Add student_class column to student_results for parity with student_activity_results
ALTER TABLE public.student_results ADD COLUMN IF NOT EXISTS student_class text NOT NULL DEFAULT '';
