-- Add 'student' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'student';

-- Create student_progress table for tracking XP and study progress
CREATE TABLE public.student_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL DEFAULT '',
  xp_earned integer NOT NULL DEFAULT 0,
  quizzes_completed integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  total_answers integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, subject)
);

ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON public.student_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON public.student_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.student_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Create student_quiz_results for quiz history
CREATE TABLE public.student_quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_type text NOT NULL DEFAULT '',
  institution text NOT NULL DEFAULT '',
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  time_spent_seconds integer NOT NULL DEFAULT 0,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz results" ON public.student_quiz_results
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz results" ON public.student_quiz_results
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);