DROP POLICY IF EXISTS "Authenticated can sign attendance" ON public.meeting_attendance;

CREATE POLICY "Meeting owner or invited teacher can sign attendance"
ON public.meeting_attendance
FOR UPDATE
TO authenticated
USING (
  signed = false
  AND EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_attendance.meeting_id
    AND m.user_id = auth.uid()
  )
)
WITH CHECK (signed = true);