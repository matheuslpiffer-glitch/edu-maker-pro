-- Notebooks Table
CREATE TABLE IF NOT EXISTS public.mat_notebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mat_notebooks TO authenticated;
GRANT ALL ON public.mat_notebooks TO service_role;

ALTER TABLE public.mat_notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notebooks"
ON public.mat_notebooks
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Sources Table
CREATE TABLE IF NOT EXISTS public.notebook_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID NOT NULL REFERENCES public.mat_notebooks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- 'pdf', 'docx', 'txt', 'image', 'link', 'note'
    content TEXT, -- Extracted text for RAG
    file_path TEXT, -- Path in storage if applicable
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notebook_sources TO authenticated;
GRANT ALL ON public.notebook_sources TO service_role;

ALTER TABLE public.notebook_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage sources of their notebooks"
ON public.notebook_sources
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.mat_notebooks WHERE id = notebook_id AND user_id = auth.uid()));

-- Artifacts/Notes Table
CREATE TABLE IF NOT EXISTS public.notebook_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID NOT NULL REFERENCES public.mat_notebooks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL, -- 'summary', 'podcast', 'exam', 'bncc', 'script', 'slides'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notebook_artifacts TO authenticated;
GRANT ALL ON public.notebook_artifacts TO service_role;

ALTER TABLE public.notebook_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage artifacts of their notebooks"
ON public.notebook_artifacts
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.mat_notebooks WHERE id = notebook_id AND user_id = auth.uid()));

-- Chat Messages for Notebooks (separate from general mat-chat if needed, or linked to session)
CREATE TABLE IF NOT EXISTS public.notebook_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID NOT NULL REFERENCES public.mat_notebooks(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user', 'assistant'
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notebook_chat_messages TO authenticated;
GRANT ALL ON public.notebook_chat_messages TO service_role;

ALTER TABLE public.notebook_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage chat in their notebooks"
ON public.notebook_chat_messages
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.mat_notebooks WHERE id = notebook_id AND user_id = auth.uid()));
