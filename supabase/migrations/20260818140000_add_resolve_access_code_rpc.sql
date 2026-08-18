CREATE OR REPLACE FUNCTION public.resolve_access_code(code text)
RETURNS TABLE(id uuid, kind text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, 'simulador'::text AS kind
  FROM public.simulators s
  WHERE s.access_code = upper(code)
  UNION ALL
  SELECT qb.id, 'atividade'::text AS kind
  FROM public.question_banks qb
  WHERE qb.access_code = upper(code)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_access_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_access_code(text) TO anon, authenticated;
