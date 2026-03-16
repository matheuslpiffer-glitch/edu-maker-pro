
-- Storage bucket for essay images
INSERT INTO storage.buckets (id, name, public) VALUES ('essay-images', 'essay-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload essay images" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'essay-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Essay images are publicly accessible" ON storage.objects FOR SELECT
USING (bucket_id = 'essay-images');

CREATE POLICY "Users can delete their essay images" ON storage.objects FOR DELETE
USING (bucket_id = 'essay-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Corrections table
CREATE TABLE public.essay_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  extracted_text TEXT NOT NULL DEFAULT '',
  comp1_score INT NOT NULL DEFAULT 0,
  comp2_score INT NOT NULL DEFAULT 0,
  comp3_score INT NOT NULL DEFAULT 0,
  comp4_score INT NOT NULL DEFAULT 0,
  comp5_score INT NOT NULL DEFAULT 0,
  total_score INT NOT NULL DEFAULT 0,
  comp1_justification TEXT NOT NULL DEFAULT '',
  comp2_justification TEXT NOT NULL DEFAULT '',
  comp3_justification TEXT NOT NULL DEFAULT '',
  comp4_justification TEXT NOT NULL DEFAULT '',
  comp5_justification TEXT NOT NULL DEFAULT '',
  golden_tips JSONB NOT NULL DEFAULT '[]'::jsonb,
  student_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.essay_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own corrections" ON public.essay_corrections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own corrections" ON public.essay_corrections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own corrections" ON public.essay_corrections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own corrections" ON public.essay_corrections FOR DELETE USING (auth.uid() = user_id);
