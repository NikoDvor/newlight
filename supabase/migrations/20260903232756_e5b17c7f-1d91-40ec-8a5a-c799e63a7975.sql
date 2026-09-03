ALTER TABLE public.document_envelopes
  ADD COLUMN IF NOT EXISTS attorney_reviewed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legal_review_note text;