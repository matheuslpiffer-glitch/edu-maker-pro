-- Create a table for materials drafts
CREATE TABLE public.materials_drafts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, storage_key)
);

-- Enable Row Level Security
ALTER TABLE public.materials_drafts ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own drafts" 
ON public.materials_drafts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drafts" 
ON public.materials_drafts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts" 
ON public.materials_drafts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts" 
ON public.materials_drafts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_materials_drafts_updated_at
BEFORE UPDATE ON public.materials_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();