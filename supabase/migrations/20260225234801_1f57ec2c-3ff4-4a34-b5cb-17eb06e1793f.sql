
CREATE TABLE public.essay_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tema TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'Social',
  textos_motivadores JSONB NOT NULL DEFAULT '[]'::jsonb,
  comando TEXT NOT NULL DEFAULT '',
  usage_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.essay_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own themes" ON public.essay_themes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own themes" ON public.essay_themes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own themes" ON public.essay_themes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own themes" ON public.essay_themes FOR DELETE USING (auth.uid() = user_id);
