
CREATE TABLE public.aee_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  topic text NOT NULL DEFAULT '',
  mode text NOT NULL DEFAULT 'gerar_novas',
  question_type text NOT NULL DEFAULT '',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.aee_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own aee activities"
  ON public.aee_activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own aee activities"
  ON public.aee_activities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own aee activities"
  ON public.aee_activities FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
