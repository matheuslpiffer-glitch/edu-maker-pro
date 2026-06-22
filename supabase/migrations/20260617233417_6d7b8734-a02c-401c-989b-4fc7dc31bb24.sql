-- 1) Restrict attendance signing to authenticated users (no anonymous forging)
DROP POLICY IF EXISTS "Anyone can sign attendance" ON public.meeting_attendance;

CREATE POLICY "Authenticated can sign attendance"
ON public.meeting_attendance
FOR UPDATE
TO authenticated
USING (signed = false)
WITH CHECK (signed = true);

-- 2) Lock search_path on functions that still allow it to be mutable
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrement_user_credits(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_credits INT;
    v_plan TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    SELECT plan, credits, plan_expires_at
    INTO v_plan, v_credits, v_expires_at
    FROM public.profiles
    WHERE id = user_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF v_plan = 'pro' AND (v_expires_at IS NULL OR v_expires_at > NOW()) THEN
        UPDATE public.profiles
        SET credits = credits - 1
        WHERE id = user_id;
        RETURN TRUE;
    END IF;

    IF v_credits > 0 THEN
        UPDATE public.profiles
        SET credits = credits - 1
        WHERE id = user_id;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$function$;

-- 3) Restrict EXECUTE on the credit decrement function — only service role
--    should call it (it is invoked from edge functions). This prevents any
--    signed-in user from draining their own (or another) account directly
--    from the SQL API.
REVOKE EXECUTE ON FUNCTION public.decrement_user_credits(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.decrement_user_credits(uuid) TO service_role;