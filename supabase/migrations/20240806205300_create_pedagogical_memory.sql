CREATE TABLE IF NOT EXISTS public.user_pedagogical_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_fact TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_pedagogical_memory TO authenticated;
GRANT ALL ON public.user_pedagogical_memory TO service_role;

ALTER TABLE public.user_pedagogical_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own pedagogical memory"
ON public.user_pedagogical_memory
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure user_roles exists and has basic security if not already present
-- (This is a safety check based on instructions about RBAC)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'teacher', 'student');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;
