
-- Table: meetings (aulas/reuniões)
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text NOT NULL,
  skill_code text NOT NULL DEFAULT '',
  skill_description text NOT NULL DEFAULT '',
  grade text NOT NULL DEFAULT '',
  objective text NOT NULL DEFAULT '',
  slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  meeting_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meetings"
  ON public.meetings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meetings"
  ON public.meetings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meetings"
  ON public.meetings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meetings"
  ON public.meetings FOR DELETE
  USING (auth.uid() = user_id);

-- Public read for signing page (anyone with meeting_id can see topic)
CREATE POLICY "Anyone can read meeting topic for signing"
  ON public.meetings FOR SELECT
  USING (true);

-- Table: meeting_attendance (presenças)
CREATE TABLE public.meeting_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  teacher_name text NOT NULL,
  signed boolean NOT NULL DEFAULT false,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;

-- Owner of the meeting can manage attendance
CREATE POLICY "Meeting owner can manage attendance"
  ON public.meeting_attendance FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.meetings WHERE id = meeting_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.meetings WHERE id = meeting_id AND user_id = auth.uid())
  );

-- Anyone can read attendance for signing page
CREATE POLICY "Anyone can read attendance"
  ON public.meeting_attendance FOR SELECT
  USING (true);

-- Anyone can update attendance (for signing)
CREATE POLICY "Anyone can sign attendance"
  ON public.meeting_attendance FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Enable realtime for attendance updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_attendance;
