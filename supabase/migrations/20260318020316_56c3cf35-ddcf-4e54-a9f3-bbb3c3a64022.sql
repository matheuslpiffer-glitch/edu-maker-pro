-- Ensure role resolution is deterministic and privileged accounts self-heal on login
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role
    WHEN 'super_admin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'user' THEN 3
    WHEN 'student' THEN 4
    ELSE 5
  END, created_at ASC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_my_access()
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_full_name text := coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''),
    nullif(auth.jwt() ->> 'email', '')
  );
  v_avatar text := coalesce(
    nullif(auth.jwt() -> 'user_metadata' ->> 'avatar_url', ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'picture', '')
  );
  v_role public.app_role;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    v_user_id,
    nullif(v_email, ''),
    nullif(v_full_name, ''),
    nullif(v_avatar, '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = now();

  IF v_email IN ('matheuslpiffer@gmail.com', 'profmatheuspiffer@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES
      (v_user_id, 'super_admin'),
      (v_user_id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  SELECT public.get_my_role() INTO v_role;
  RETURN v_role;
END;
$$;