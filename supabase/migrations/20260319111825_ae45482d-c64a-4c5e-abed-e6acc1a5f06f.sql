
ALTER TABLE public.simulators ADD COLUMN IF NOT EXISTS access_code TEXT UNIQUE DEFAULT NULL;
ALTER TABLE public.question_banks ADD COLUMN IF NOT EXISTS access_code TEXT UNIQUE DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    SELECT EXISTS(
      SELECT 1 FROM public.simulators WHERE access_code = new_code
      UNION ALL
      SELECT 1 FROM public.question_banks WHERE access_code = new_code
    ) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  NEW.access_code := new_code;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER set_simulator_access_code
  BEFORE INSERT ON public.simulators
  FOR EACH ROW
  WHEN (NEW.access_code IS NULL)
  EXECUTE FUNCTION public.generate_access_code();

CREATE OR REPLACE TRIGGER set_question_bank_access_code
  BEFORE INSERT ON public.question_banks
  FOR EACH ROW
  WHEN (NEW.access_code IS NULL)
  EXECUTE FUNCTION public.generate_access_code();
