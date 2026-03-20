
-- 1. Client Forms table
CREATE TABLE IF NOT EXISTS public.client_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  form_name TEXT NOT NULL,
  form_type TEXT NOT NULL DEFAULT 'booking',
  form_status TEXT NOT NULL DEFAULT 'draft',
  linked_calendar_id UUID REFERENCES public.calendars(id),
  intake_questions JSONB DEFAULT '[]'::jsonb,
  required_fields JSONB DEFAULT '[]'::jsonb,
  notification_owner TEXT,
  confirmation_message TEXT,
  form_settings JSONB DEFAULT '{}'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Activation Drafts table
CREATE TABLE IF NOT EXISTS public.activation_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  draft_name TEXT NOT NULL DEFAULT 'Untitled Draft',
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_step INTEGER NOT NULL DEFAULT 1,
  draft_status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. RLS
ALTER TABLE public.client_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_forms_access" ON public.client_forms
  FOR ALL TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id))
  WITH CHECK (public.user_has_client_access(auth.uid(), client_id));

CREATE POLICY "activation_drafts_admin" ON public.activation_drafts
  FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()))
  WITH CHECK (public.is_admin_or_operator(auth.uid()));

-- 4. Triggers
CREATE TRIGGER set_updated_at_client_forms
  BEFORE UPDATE ON public.client_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_activation_drafts
  BEFORE UPDATE ON public.activation_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
