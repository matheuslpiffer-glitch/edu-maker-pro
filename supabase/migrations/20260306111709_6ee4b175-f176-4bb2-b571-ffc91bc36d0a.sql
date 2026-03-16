
ALTER TABLE public.pisa_simulators 
ADD COLUMN class_name text NOT NULL DEFAULT '',
ADD COLUMN bimester integer NOT NULL DEFAULT 1,
ADD COLUMN institution_name text NOT NULL DEFAULT '';
