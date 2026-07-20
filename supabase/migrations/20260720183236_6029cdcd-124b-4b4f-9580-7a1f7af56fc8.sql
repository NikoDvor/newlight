-- Turn A: Additively backfill client_forms rows into forms + form_fields.
-- ID-preserving so bdr_calendars.booking_form_id (currently FK to client_forms)
-- resolves to the same UUID in the new schema. client_forms is NOT dropped.

INSERT INTO public.forms (
  id, client_id, form_name, form_type, is_active,
  confirmation_message, is_global, created_at, updated_at
)
SELECT
  cf.id,
  cf.client_id,
  cf.form_name,
  cf.form_type,
  (cf.form_status <> 'archived'),
  cf.confirmation_message,
  false,
  cf.created_at,
  cf.updated_at
FROM public.client_forms cf
WHERE NOT EXISTS (SELECT 1 FROM public.forms f WHERE f.id = cf.id);

INSERT INTO public.form_fields (
  client_id, form_id, field_label, field_key, field_type,
  is_required, field_order, options_json, placeholder_text, help_text
)
SELECT
  cf.client_id,
  cf.id,
  COALESCE(q->>'label', q->>'field_label', q->>'id', 'Question '||ord::text),
  COALESCE(q->>'id', q->>'key', q->>'field_key', 'q_'||ord::text),
  COALESCE(q->>'type', q->>'field_type', 'text'),
  COALESCE(
    NULLIF(q->>'required','')::boolean,
    NULLIF(q->>'is_required','')::boolean,
    (cf.required_fields ? COALESCE(q->>'id', q->>'key', q->>'field_key', '')),
    false
  ),
  (ord - 1)::int,
  CASE
    WHEN jsonb_typeof(q->'options') IN ('array','object') THEN q->'options'
    WHEN jsonb_typeof(q->'options_json') IN ('array','object') THEN q->'options_json'
    ELSE NULL
  END,
  q->>'placeholder',
  q->>'help'
FROM public.client_forms cf
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(cf.intake_questions,'[]'::jsonb)) WITH ORDINALITY AS t(q, ord)
WHERE jsonb_typeof(COALESCE(cf.intake_questions,'[]'::jsonb)) = 'array'
  AND NOT EXISTS (SELECT 1 FROM public.form_fields ff WHERE ff.form_id = cf.id);