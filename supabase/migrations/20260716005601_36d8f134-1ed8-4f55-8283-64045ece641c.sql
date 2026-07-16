
CREATE TABLE public.marketing_content_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  material_type text NOT NULL,
  template_text text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_content_templates TO authenticated;
GRANT ALL ON public.marketing_content_templates TO service_role;

ALTER TABLE public.marketing_content_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active templates"
  ON public.marketing_content_templates FOR SELECT TO authenticated
  USING (is_active = true OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert templates"
  ON public.marketing_content_templates FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update templates"
  ON public.marketing_content_templates FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete templates"
  ON public.marketing_content_templates FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_marketing_content_templates_updated_at
  BEFORE UPDATE ON public.marketing_content_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.marketing_content_templates (title, category, material_type, template_text) VALUES
(
  'Social Security Claiming Timing — Educational Email',
  'Social Security',
  'email',
  E'Subject: A few things to consider before you claim Social Security\n\nHi {{first_name}},\n\nDeciding when to start Social Security is one of the more consequential retirement decisions many people make, and there is no single right answer. Claiming earlier means more years of payments; delaying can mean a larger monthly benefit. Health, other income sources, marital status, and continued work can all affect which timing makes sense for your situation.\n\nIf you would like to talk through the tradeoffs as they apply to your circumstances — not a recommendation, just an educational conversation — reply to this email and we can set up a short review.\n\nThis message is for educational purposes only and is not individualized tax, legal, or investment advice.'
),
(
  'Retirement Income Planning Basics — Social Post',
  'Retirement Income',
  'social_post',
  E'Retirement income planning is less about picking one perfect product and more about coordinating the pieces you already have: Social Security, any pensions, savings, and healthcare costs. A written plan can help you see how the pieces fit together and where there may be gaps to address. Educational content — not a recommendation. Talk with a qualified professional about your own situation.'
),
(
  'Educational Seminar Invitation — Email',
  'Seminar Invite',
  'email',
  E'Subject: You are invited: {{seminar_title}}\n\nHi {{first_name}},\n\nWe are hosting an educational session on {{seminar_topic}} on {{seminar_date}} at {{seminar_time}}. The session is designed to help attendees understand the concepts involved and the questions worth asking — it is educational in nature and no products are sold at the event.\n\nSeating is limited. You can register here: {{registration_link}}\n\nIf the date does not work, reply to this email and we will send information about future sessions.\n\nThis invitation is for educational purposes only and is not individualized tax, legal, or investment advice.'
),
(
  'Tax-Smart Investing Considerations — Landing Page Blurb',
  'Tax Planning',
  'landing_page',
  E'Tax-Smart Investing: Considerations Worth Reviewing\n\nHow investments are held and when they are sold can influence the tax bill they generate. Concepts like asset location (which types of accounts hold which types of investments), tax-loss harvesting, and coordinating withdrawals across taxable, tax-deferred, and tax-free accounts are all worth reviewing periodically.\n\nThis page is educational and does not constitute individualized tax or investment advice. Every situation is different — please consult a qualified tax professional about your own circumstances before making decisions.'
),
(
  'Required Minimum Distributions — Educational Email',
  'RMD/Required Distributions',
  'email',
  E'Subject: A quick reminder about Required Minimum Distributions\n\nHi {{first_name}},\n\nIf you have reached the age at which Required Minimum Distributions (RMDs) apply to your retirement accounts, it is worth confirming that this year''s distribution is on track. Missing or under-withdrawing an RMD can create an avoidable IRS penalty.\n\nA few items that are often helpful to review each year:\n- Which accounts have an RMD requirement this year\n- How the amount is calculated for each account\n- Whether Qualified Charitable Distributions are worth considering\n- Withholding elections on the distribution\n\nIf you would like a short educational walkthrough of how RMDs apply to your accounts, reply to this email and we can schedule time.\n\nThis message is educational only and is not individualized tax, legal, or investment advice.'
);
