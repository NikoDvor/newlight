
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'onboarding_stage'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN onboarding_stage text NOT NULL DEFAULT 'lead';
  END IF;
END $$;
