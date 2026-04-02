
-- Extend client_setup_items with assignment/execution fields
ALTER TABLE public.client_setup_items
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS blocked_by TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by UUID;

-- Implementation tasks table for profile-driven internal work
CREATE TABLE public.implementation_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  task_label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  task_status TEXT NOT NULL DEFAULT 'not_started',
  assigned_to UUID,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium',
  blocked_by TEXT,
  internal_notes TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  source_profile TEXT,
  source_setup_item_id UUID REFERENCES public.client_setup_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, task_key)
);

ALTER TABLE public.implementation_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/operator full access on impl tasks"
  ON public.implementation_tasks FOR ALL
  USING (public.is_admin_or_operator(auth.uid()));

CREATE POLICY "Client team can view own impl tasks"
  ON public.implementation_tasks FOR SELECT
  USING (public.user_has_client_access(auth.uid(), client_id));

CREATE TRIGGER update_implementation_tasks_updated_at
  BEFORE UPDATE ON public.implementation_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_impl_tasks_client ON public.implementation_tasks(client_id);
CREATE INDEX idx_impl_tasks_status ON public.implementation_tasks(task_status);
CREATE INDEX idx_impl_tasks_assigned ON public.implementation_tasks(assigned_to);
CREATE INDEX idx_impl_tasks_due ON public.implementation_tasks(due_date);
