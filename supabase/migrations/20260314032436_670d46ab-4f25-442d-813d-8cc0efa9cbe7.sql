
-- Demo builds table for pre-closing tailored workspaces
CREATE TABLE public.demo_builds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  website TEXT,
  primary_location TEXT,
  business_type TEXT,
  main_service TEXT,
  primary_goal TEXT,
  booking_link TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#06B6D4',
  social_links JSONB DEFAULT '{}',
  notes TEXT,
  workspace_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'build_in_progress',
  assigned_to UUID,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_builds ENABLE ROW LEVEL SECURITY;

-- Admin/operator full access
CREATE POLICY "Admins manage demo builds" ON public.demo_builds
  FOR ALL TO authenticated
  USING (is_admin_or_operator(auth.uid()))
  WITH CHECK (is_admin_or_operator(auth.uid()));

-- Anon demo access
CREATE POLICY "Anon demo access on demo_builds" ON public.demo_builds
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

-- Updated at trigger
CREATE TRIGGER update_demo_builds_updated_at
  BEFORE UPDATE ON public.demo_builds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
