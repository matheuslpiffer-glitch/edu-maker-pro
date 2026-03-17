-- Update trigger to also assign super_admin to second email
CREATE OR REPLACE FUNCTION public.assign_super_admin_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IN ('matheuslpiffer@gmail.com', 'profmatheuspiffer@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;