
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'client_owner', 'client_team', 'read_only');

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  workspace_slug TEXT NOT NULL UNIQUE,
  industry TEXT,
  primary_location TEXT,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  service_package TEXT DEFAULT 'starter',
  owner_name TEXT,
  owner_email TEXT,
  status TEXT NOT NULL DEFAULT 'provisioning' CHECK (status IN ('provisioning', 'active', 'paused', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  UNIQUE (user_id, role, client_id)
);

-- Create provision_queue table
CREATE TABLE public.provision_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  provision_status TEXT NOT NULL DEFAULT 'provisioning' CHECK (provision_status IN ('provisioning', 'automation_configuring', 'qa_review', 'ready')),
  automation_setup BOOLEAN DEFAULT false,
  crm_setup BOOLEAN DEFAULT false,
  integrations_status TEXT DEFAULT 'pending',
  errors TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fix_now_items table
CREATE TABLE public.fix_now_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  issue TEXT NOT NULL,
  module TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  assigned_operator UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  module TEXT,
  status TEXT DEFAULT 'success',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_integrations table
CREATE TABLE public.client_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  integration_name TEXT NOT NULL,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (client_id, integration_name)
);

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provision_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fix_now_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_integrations ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is admin or operator
CREATE OR REPLACE FUNCTION public.is_admin_or_operator(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'operator')
  )
$$;

-- Check if user belongs to a client
CREATE OR REPLACE FUNCTION public.user_has_client_access(_user_id UUID, _client_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role IN ('admin', 'operator') OR client_id = _client_id)
  )
$$;

-- RLS policies for clients
CREATE POLICY "Admins can manage all clients" ON public.clients
  FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Client users can view their own client" ON public.clients
  FOR SELECT TO authenticated
  USING (public.user_has_client_access(auth.uid(), id));

-- RLS policies for user_roles
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- RLS policies for provision_queue
CREATE POLICY "Admins can manage provision queue" ON public.provision_queue
  FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()));

-- RLS policies for fix_now_items
CREATE POLICY "Admins can manage fix now items" ON public.fix_now_items
  FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()));

-- RLS policies for audit_logs
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- RLS policies for client_integrations
CREATE POLICY "Admins can manage integrations" ON public.client_integrations
  FOR ALL TO authenticated
  USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Client users can view their integrations" ON public.client_integrations
  FOR SELECT TO authenticated
  USING (public.user_has_client_access(auth.uid(), client_id));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_provision_queue_updated_at BEFORE UPDATE ON public.provision_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fix_now_items_updated_at BEFORE UPDATE ON public.fix_now_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_integrations_updated_at BEFORE UPDATE ON public.client_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
