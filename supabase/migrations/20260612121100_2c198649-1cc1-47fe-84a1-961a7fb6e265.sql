CREATE OR REPLACE FUNCTION public.decrement_user_credits(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_credits INT;
    v_plan TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Get current plan and credits
    SELECT plan, credits, plan_expires_at 
    INTO v_plan, v_credits, v_expires_at
    FROM public.profiles 
    WHERE id = user_id;

    -- If user not found, return false
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Check if Pro plan is active
    IF v_plan = 'pro' AND (v_expires_at IS NULL OR v_expires_at > NOW()) THEN
        -- Pro users still decrement credits for tracking, but we allow even if 0 or negative
        -- unless we want a hard limit for Pro too. 
        -- Based on instructions: "permita gerar normalmente"
        UPDATE public.profiles 
        SET credits = credits - 1 
        WHERE id = user_id;
        RETURN TRUE;
    END IF;

    -- For non-pro or expired pro (treating as free)
    IF v_credits > 0 THEN
        UPDATE public.profiles 
        SET credits = credits - 1 
        WHERE id = user_id;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_user_credits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_user_credits(UUID) TO service_role;
