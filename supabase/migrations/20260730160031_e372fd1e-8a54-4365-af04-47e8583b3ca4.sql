CREATE TABLE public.kv_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  property_1 text NOT NULL,
  property_2 text NOT NULL,
  value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT kv_records_unique_key UNIQUE (user_id, property_1, property_2)
);

GRANT ALL ON public.kv_records TO service_role;

ALTER TABLE public.kv_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages kv records"
ON public.kv_records FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE TRIGGER update_kv_records_updated_at
BEFORE UPDATE ON public.kv_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();