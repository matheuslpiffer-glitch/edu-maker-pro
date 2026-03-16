
-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Anyone can sign attendance" ON public.meeting_attendance;

-- Create a more restrictive update policy: only allow setting signed=true
CREATE POLICY "Anyone can sign attendance"
  ON public.meeting_attendance FOR UPDATE
  USING (signed = false)
  WITH CHECK (signed = true);

-- Trigger to prevent tampering with other fields during public signing
CREATE OR REPLACE FUNCTION public.validate_attendance_signing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow changing signed and signed_at
  IF NEW.meeting_id != OLD.meeting_id OR NEW.teacher_name != OLD.teacher_name THEN
    RAISE EXCEPTION 'Cannot modify meeting_id or teacher_name';
  END IF;
  -- Auto-set signed_at
  IF NEW.signed = true AND OLD.signed = false THEN
    NEW.signed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_attendance_signing_trigger
  BEFORE UPDATE ON public.meeting_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_attendance_signing();
