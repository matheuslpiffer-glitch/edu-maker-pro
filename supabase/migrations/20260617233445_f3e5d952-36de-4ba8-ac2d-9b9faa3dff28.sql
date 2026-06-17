-- Trigger-only functions: should never be called as RPCs
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_super_admin_on_signup()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_attendance_signing()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_generation_jobs_updated_at()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_access_code()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_essay_access_code()         FROM PUBLIC, anon, authenticated;

-- RLS helper functions: callable only by signed-in users (RLS policies still work
-- because they execute with the function owner's privileges via SECURITY DEFINER)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role)             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_role()                        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text)  FROM PUBLIC, anon;

GRANT  EXECUTE ON FUNCTION public.has_role(uuid, app_role)             TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.get_my_role()                        TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.has_active_subscription(uuid, text)  TO authenticated, service_role;

-- Bootstrap helper: signed-in users only
REVOKE EXECUTE ON FUNCTION public.bootstrap_my_access()                FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.bootstrap_my_access()                TO authenticated, service_role;