
CREATE POLICY "Anyone can read pisa simulator by id" ON public.pisa_simulators
FOR SELECT USING (true);
