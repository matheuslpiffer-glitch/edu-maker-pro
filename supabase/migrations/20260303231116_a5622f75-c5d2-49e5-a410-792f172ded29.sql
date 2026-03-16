
-- Create calendar_events table for Strategic Agenda
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  event_date timestamp with time zone NOT NULL DEFAULT now(),
  duration_minutes integer NOT NULL DEFAULT 60,
  category text NOT NULL DEFAULT 'pedagogica',
  event_type text NOT NULL DEFAULT 'atpc',
  location text NOT NULL DEFAULT '',
  whatsapp_webhook_url text NOT NULL DEFAULT '',
  reminder_sent boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own events"
ON public.calendar_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events"
ON public.calendar_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
ON public.calendar_events FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
ON public.calendar_events FOR DELETE
USING (auth.uid() = user_id);

-- Index for date queries
CREATE INDEX idx_calendar_events_date ON public.calendar_events (event_date);
CREATE INDEX idx_calendar_events_user ON public.calendar_events (user_id);
