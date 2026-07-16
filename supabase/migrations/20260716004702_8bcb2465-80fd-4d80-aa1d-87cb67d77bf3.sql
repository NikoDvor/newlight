ALTER TABLE public.marketing_materials
  ADD COLUMN IF NOT EXISTS related_social_post_id uuid
    REFERENCES public.social_posts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_materials_related_social_post
  ON public.marketing_materials(related_social_post_id);

-- On social_posts pending_approval → create linked marketing_materials
CREATE OR REPLACE FUNCTION public.link_social_post_to_marketing_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
BEGIN
  IF NEW.status = 'pending_approval'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT id INTO existing_id
    FROM public.marketing_materials
    WHERE related_social_post_id = NEW.id
    LIMIT 1;

    IF existing_id IS NULL THEN
      INSERT INTO public.marketing_materials
        (client_id, title, material_type, status, content_text, has_testimonial,
         created_by, related_social_post_id)
      VALUES (
        NEW.client_id,
        'Social post — ' || COALESCE(LEFT(NEW.caption, 60), '(no caption)'),
        'social_post',
        'submitted',
        NEW.caption,
        false,
        NEW.created_by,
        NEW.id
      );
    ELSE
      -- Re-submit any pre-existing linked row if it drifted out of submitted
      UPDATE public.marketing_materials
      SET status = 'submitted',
          content_text = NEW.caption,
          updated_at = now()
      WHERE id = existing_id
        AND status IN ('draft', 'changes_requested');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS link_social_post_to_marketing_review_trg ON public.social_posts;
CREATE TRIGGER link_social_post_to_marketing_review_trg
AFTER INSERT OR UPDATE ON public.social_posts
FOR EACH ROW EXECUTE FUNCTION public.link_social_post_to_marketing_review();

-- On marketing_materials approval → flip linked social_posts status
CREATE OR REPLACE FUNCTION public.propagate_marketing_approval_to_social_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.related_social_post_id IS NOT NULL
     AND NEW.status = 'approved'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.social_posts sp
    SET status = CASE
                   WHEN sp.scheduled_at IS NOT NULL AND sp.scheduled_at > now()
                     THEN 'scheduled'
                   ELSE 'posted'
                 END,
        published_at = CASE
                         WHEN sp.scheduled_at IS NULL OR sp.scheduled_at <= now()
                           THEN COALESCE(sp.published_at, now())
                         ELSE sp.published_at
                       END,
        updated_at = now()
    WHERE sp.id = NEW.related_social_post_id
      AND sp.status = 'pending_approval';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS propagate_marketing_approval_to_social_post_trg ON public.marketing_materials;
CREATE TRIGGER propagate_marketing_approval_to_social_post_trg
AFTER INSERT OR UPDATE ON public.marketing_materials
FOR EACH ROW EXECUTE FUNCTION public.propagate_marketing_approval_to_social_post();