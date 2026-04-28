DROP TABLE IF EXISTS public.nl_training_chapter_level_progress CASCADE;
DROP TABLE IF EXISTS public.nl_training_exam_attempts CASCADE;
DROP TABLE IF EXISTS public.nl_training_certifications CASCADE;
DROP TABLE IF EXISTS public.nl_training_progress CASCADE;
DROP TABLE IF EXISTS public.nl_training_questions CASCADE;
DROP TABLE IF EXISTS public.nl_training_chapters CASCADE;
DROP TABLE IF EXISTS public.nl_training_modules CASCADE;
DROP TABLE IF EXISTS public.nl_training_tracks CASCADE;

CREATE TABLE public.nl_training_tracks (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, track_key TEXT NOT NULL UNIQUE, track_name TEXT NOT NULL, description TEXT, is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE public.nl_training_modules (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, track_id UUID NOT NULL REFERENCES public.nl_training_tracks(id) ON DELETE CASCADE, module_number INT NOT NULL, module_title TEXT NOT NULL, module_description TEXT, is_locked BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(track_id, module_number));
CREATE TABLE public.nl_training_chapters (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, module_id UUID NOT NULL REFERENCES public.nl_training_modules(id) ON DELETE CASCADE, chapter_number INT NOT NULL, chapter_title TEXT NOT NULL, chapter_description TEXT, content TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(module_id, chapter_number));
CREATE TABLE public.nl_training_questions (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, chapter_id UUID REFERENCES public.nl_training_chapters(id) ON DELETE CASCADE, module_id UUID NOT NULL REFERENCES public.nl_training_modules(id) ON DELETE CASCADE, question_type TEXT NOT NULL CHECK (question_type IN ('chapter_quiz','module_test','certification')), quiz_level INT NOT NULL DEFAULT 1 CHECK (quiz_level IN (1,2,3)), question_text TEXT NOT NULL, options JSONB NOT NULL DEFAULT '[]'::jsonb, correct_index INT NOT NULL CHECK (correct_index BETWEEN 0 AND 3), explanation TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE public.nl_training_progress (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, track_id UUID NOT NULL REFERENCES public.nl_training_tracks(id) ON DELETE CASCADE, module_id UUID NOT NULL REFERENCES public.nl_training_modules(id) ON DELETE CASCADE, chapter_id UUID REFERENCES public.nl_training_chapters(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')), score INT, attempts INT NOT NULL DEFAULT 0, last_attempt_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT nl_training_progress_user_module_chapter_key UNIQUE NULLS NOT DISTINCT (user_id, module_id, chapter_id));
CREATE TABLE public.nl_training_certifications (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, track_id UUID NOT NULL REFERENCES public.nl_training_tracks(id) ON DELETE CASCADE, track_key TEXT NOT NULL, score INT NOT NULL, passed BOOLEAN NOT NULL DEFAULT false, rep_name TEXT, total_questions INT NOT NULL DEFAULT 0, certificate_number TEXT UNIQUE, issued_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE public.nl_training_exam_attempts (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, track_id UUID NOT NULL REFERENCES public.nl_training_tracks(id) ON DELETE CASCADE, score INT NOT NULL, passed BOOLEAN NOT NULL DEFAULT false, attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE public.nl_training_chapter_level_progress (id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, track_id UUID NOT NULL REFERENCES public.nl_training_tracks(id) ON DELETE CASCADE, module_id UUID NOT NULL REFERENCES public.nl_training_modules(id) ON DELETE CASCADE, chapter_id UUID NOT NULL REFERENCES public.nl_training_chapters(id) ON DELETE CASCADE, quiz_level INT NOT NULL CHECK (quiz_level IN (1,2,3)), status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')), score INT, attempts INT NOT NULL DEFAULT 0, last_attempt_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(user_id, chapter_id, quiz_level));

CREATE INDEX idx_nl_training_modules_track ON public.nl_training_modules(track_id, module_number);
CREATE INDEX idx_nl_training_chapters_module ON public.nl_training_chapters(module_id, chapter_number);
CREATE INDEX idx_nl_training_questions_module ON public.nl_training_questions(module_id);
CREATE INDEX idx_nl_training_questions_chapter ON public.nl_training_questions(chapter_id);
CREATE INDEX idx_nl_training_questions_chapter_level ON public.nl_training_questions(chapter_id, quiz_level) WHERE question_type = 'chapter_quiz';
CREATE INDEX idx_nl_training_progress_user ON public.nl_training_progress(user_id);
CREATE INDEX idx_nl_training_progress_user_module ON public.nl_training_progress(user_id, module_id);
CREATE INDEX idx_nl_training_certifications_user ON public.nl_training_certifications(user_id);
CREATE INDEX idx_nl_training_exam_attempts_user ON public.nl_training_exam_attempts(user_id, attempted_at DESC);
CREATE INDEX idx_nl_training_level_progress_user ON public.nl_training_chapter_level_progress(user_id, module_id, chapter_id);

ALTER TABLE public.nl_training_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nl_training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nl_training_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nl_training_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nl_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nl_training_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nl_training_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nl_training_chapter_level_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Training tracks readable by authenticated users" ON public.nl_training_tracks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and operators manage training tracks" ON public.nl_training_tracks FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid())) WITH CHECK (public.is_admin_or_operator(auth.uid()));
CREATE POLICY "Training modules readable by authenticated users" ON public.nl_training_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and operators manage training modules" ON public.nl_training_modules FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid())) WITH CHECK (public.is_admin_or_operator(auth.uid()));
CREATE POLICY "Training chapters readable by authenticated users" ON public.nl_training_chapters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and operators manage training chapters" ON public.nl_training_chapters FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid())) WITH CHECK (public.is_admin_or_operator(auth.uid()));
CREATE POLICY "Training questions readable by authenticated users" ON public.nl_training_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and operators manage training questions" ON public.nl_training_questions FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid())) WITH CHECK (public.is_admin_or_operator(auth.uid()));
CREATE POLICY "Users select own training progress" ON public.nl_training_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins and operators select all training progress" ON public.nl_training_progress FOR SELECT TO authenticated USING (public.is_admin_or_operator(auth.uid()));
CREATE POLICY "Users insert own training progress" ON public.nl_training_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own training progress" ON public.nl_training_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins and operators update training progress" ON public.nl_training_progress FOR UPDATE TO authenticated USING (public.is_admin_or_operator(auth.uid())) WITH CHECK (public.is_admin_or_operator(auth.uid()));
CREATE POLICY "Admins and operators delete training progress" ON public.nl_training_progress FOR DELETE TO authenticated USING (public.is_admin_or_operator(auth.uid()));
CREATE POLICY "Users select own certifications" ON public.nl_training_certifications FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()));
CREATE POLICY "Users insert own certifications" ON public.nl_training_certifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins and operators manage certifications" ON public.nl_training_certifications FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid())) WITH CHECK (public.is_admin_or_operator(auth.uid()));
CREATE POLICY "Users select own exam attempts" ON public.nl_training_exam_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()));
CREATE POLICY "Users insert own exam attempts" ON public.nl_training_exam_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins and operators manage exam attempts" ON public.nl_training_exam_attempts FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid())) WITH CHECK (public.is_admin_or_operator(auth.uid()));
CREATE POLICY "Users select own chapter level progress" ON public.nl_training_chapter_level_progress FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin_or_operator(auth.uid()));
CREATE POLICY "Users insert own chapter level progress" ON public.nl_training_chapter_level_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own chapter level progress" ON public.nl_training_chapter_level_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins and operators manage chapter level progress" ON public.nl_training_chapter_level_progress FOR ALL TO authenticated USING (public.is_admin_or_operator(auth.uid())) WITH CHECK (public.is_admin_or_operator(auth.uid()));
CREATE TRIGGER update_nl_training_chapter_level_progress_updated_at BEFORE UPDATE ON public.nl_training_chapter_level_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
DECLARE bdr_track UUID; sdr_track UUID; m1 UUID; m2 UUID; mod_id UUID;
BEGIN
INSERT INTO public.nl_training_tracks (track_key, track_name, description) VALUES ('bdr','BDR Training Track','Complete certification program for Business Development Representatives at NewLight Marketing') RETURNING id INTO bdr_track;
INSERT INTO public.nl_training_tracks (track_key, track_name, description) VALUES ('sdr','SDR Training Track','Placeholder certification program for Sales Development Representatives') RETURNING id INTO sdr_track;
INSERT INTO public.nl_training_modules (track_id,module_number,module_title,module_description,is_locked) VALUES
(bdr_track,1,'The BDR Role & Mindset','Establish the identity, operating standards, and daily ownership required to create qualified opportunities.',false),
(bdr_track,2,'Lead Generation & Prospecting','Build targeted lead lists, research accounts, and start high-quality conversations across outbound channels.',true),
(bdr_track,3,'Communication Mastery','Develop vocal tonality, pacing, body language, and prospect matching skills.',true),
(bdr_track,4,'Sales Fundamentals & Techniques','Apply buyer psychology, probability thinking, anchoring, reframing, upsells, downpitches, and pattern interrupts.',true),
(bdr_track,5,'Script Mastery','Internalize scripts so reps can guide calls with structure while sounding natural.',true),
(bdr_track,6,'Objection Handling','Diagnose resistance, isolate the real concern, and respond without pressure or defensiveness.',true),
(bdr_track,7,'Closing Techniques','Convert qualified interest into next steps using clear, ethical closing frameworks.',true),
(bdr_track,8,'Discovery & Meeting Prep','Prepare notes, qualify opportunities, and set closers up with useful context.',true),
(bdr_track,9,'Product Knowledge & ROI Selling','Connect NewLight services to measurable business outcomes and return on investment.',true),
(bdr_track,10,'KPIs & Daily Accountability','Manage activity, pipeline hygiene, coaching loops, and personal performance standards.',true);
INSERT INTO public.nl_training_modules (track_id,module_number,module_title,module_description,is_locked)
SELECT sdr_track,n,title,'Placeholder SDR module. Content will be authored after the BDR track is stable.',true FROM (VALUES (1,'The SDR Role & Mindset'),(2,'Inbound Lead Qualification'),(3,'Outbound Research'),(4,'Communication Mastery'),(5,'Discovery Fundamentals'),(6,'Objection Handling'),(7,'Meeting Setting'),(8,'CRM Hygiene'),(9,'Product & ROI Basics'),(10,'KPIs & Daily Accountability')) v(n,title);
SELECT id INTO m1 FROM public.nl_training_modules WHERE track_id=bdr_track AND module_number=1;
SELECT id INTO m2 FROM public.nl_training_modules WHERE track_id=bdr_track AND module_number=2;
INSERT INTO public.nl_training_chapters (module_id,chapter_number,chapter_title,chapter_description,content) VALUES
(m1,1,'BDR Role, Mission, and Ownership','Understand what a BDR owns and how the role creates revenue momentum.',$content$THE BDR ROLE, MISSION, AND OWNERSHIP

A Business Development Representative is not a caller, scheduler, or script reader. A BDR is the first revenue operator in the sales motion. Your job is to create qualified sales conversations by finding the right businesses, opening the right conversations, and transferring useful context to the closer.

The role matters because every high-ticket sales process needs controlled opportunity flow. Marketing can create attention, but attention does not become revenue until someone qualifies it, follows up, handles early resistance, and moves the right prospect to the next step. That is the BDR lane.

OWNERSHIP STANDARD

You own the top of the pipeline. That means you do not wait for perfect leads, perfect scripts, or perfect timing. You manage daily activity, track every conversation, learn from every response, and keep the pipeline moving. If a lead is unclear, you research. If a prospect is busy, you follow up. If a conversation stalls, you create the next clear action.

THE REAL OUTPUT

Your output is not dials, messages, or booked calls alone. Your output is qualified opportunity. A qualified opportunity has a real business, a relevant problem, a believable reason to engage, and a next step the prospect understands.

DAILY OPERATING RHYTHM

A strong BDR day has four blocks: list building, outreach, live conversations, and follow-up. List building fills tomorrow's pipeline. Outreach creates new conversations. Live conversations qualify interest. Follow-up converts delayed interest into booked meetings. Skipping any block creates future inconsistency.

CHAPTER TAKEAWAY

A BDR creates revenue opportunities by owning the first mile of the sales process. The role requires activity, judgment, organization, resilience, and professional communication.$content$),
(m1,2,'Mindset, Resilience, and the Probability Game','Build the emotional discipline to execute consistently through rejection.',$content$MINDSET, RESILIENCE, AND THE PROBABILITY GAME

BDR work is a probability game executed through human conversations. Most prospects will not respond on the first attempt. Many will say no before they understand the value. Some will be rude, distracted, or unavailable. None of that means the system is broken.

PROBABILITY THINKING

If your conversion rate is one qualified meeting per twenty meaningful touches, then nineteen non-conversions are not failure. They are part of the math. The danger is emotional decision-making after a small sample size.

RESILIENCE IN PRACTICE

Resilience is not pretending rejection feels good. It is returning to the standard quickly. After a bad call, review what happened, extract the lesson, reset your tone, and make the next attempt clean.

CONFIDENCE WITHOUT ENTITLEMENT

Confidence means you believe the conversation could help the prospect. Entitlement means you believe they owe you attention. Prospects owe you nothing. You earn attention by being relevant, concise, and composed.

CHAPTER TAKEAWAY

BDR success comes from disciplined repetition, emotional neutrality, and probability thinking.$content$),
(m1,3,'Pipeline Ownership and CRM Discipline','Learn how notes, statuses, and follow-up hygiene protect revenue.',$content$PIPELINE OWNERSHIP AND CRM DISCIPLINE

The CRM is not an administrative burden. It is the memory of the revenue system. If the CRM is inaccurate, the team forgets who was contacted, what was promised, when to follow up, and why a prospect matters.

WHAT GOOD NOTES DO

Good notes answer three questions: What is the prospect's situation? What did they care about? What should happen next? A closer should be able to read your notes and understand the conversation without asking you to retell everything.

STATUS DISCIPLINE

Statuses should describe reality, not hope. Follow-up tasks should never live only in your head. If the next step matters, it belongs in the system.

HANDOFF QUALITY

The BDR-to-closer handoff is where many teams lose trust. If the BDR captures pain, context, budget signals, timing, and objections, the closer can run a sharper conversation.

CHAPTER TAKEAWAY

Accurate notes, honest statuses, and disciplined follow-up create trust, improve close rates, and prevent revenue from slipping through operational cracks.$content$),
(m2,1,'Ideal Customer Profile and Lead Sources','Identify the right prospects before investing outreach effort.',$content$IDEAL CUSTOMER PROFILE AND LEAD SOURCES

Prospecting begins before the first message. The quality of your outreach depends heavily on the quality of your target list. A strong BDR identifies businesses likely to feel the problem NewLight can solve and likely to benefit from a growth system.

GOOD FIT SIGNALS

Look for signs that a business has demand or wants more demand: active ads, recent hiring, multiple locations, a strong review base, weak follow-up systems, inconsistent social presence, slow website experience, or public complaints about availability.

PRIORITIZATION

Tier A leads show strong fit and urgency. Tier B leads show fit but less urgency. Tier C leads are uncertain and should receive lighter touches until they show interest.

CHAPTER TAKEAWAY

Lead generation is a targeting discipline. The better you define fit, source leads, identify signals, and prioritize outreach, the more productive every call, email, and message becomes.$content$),
(m2,2,'Research, Personalization, and First Touch Strategy','Turn research into concise openers and channel-specific first touches.',$content$RESEARCH, PERSONALIZATION, AND FIRST TOUCH STRATEGY

Research exists to create relevance, not to delay action. A BDR should know enough to make the first touch specific, but not so much that research becomes procrastination.

THE FIRST TOUCH

A strong first touch is concise, relevant, and low-friction. It should answer why this business, why now, and what simple next step makes sense.

CHANNEL STRATEGY

Calls create speed and live feedback. Email creates documentation and detail. Social messages can work when the prospect is active there. The best outbound sequences use channels intentionally instead of randomly.

CHAPTER TAKEAWAY

Research should produce a specific reason to reach out. Strong first touches are brief, relevant, and built around a simple question.$content$),
(m2,3,'Outbound Cadence and Follow-Up Discipline','Use structured multi-touch follow-up without sounding robotic.',$content$OUTBOUND CADENCE AND FOLLOW-UP DISCIPLINE

Most opportunities are created after more than one touch. Prospects are busy, distracted, and often not thinking about the problem at the moment you contact them. Follow-up is not pestering when it is relevant, professional, and spaced appropriately.

CADENCE DESIGN

A practical cadence mixes calls, emails, and other appropriate channels over several days or weeks. Each touch should add context or create an easy reply.

FOLLOW-UP AFTER CONVERSATIONS

After a live conversation, follow-up should reflect what was discussed. Always set the next step before ending a conversation when possible.

CHAPTER TAKEAWAY

A strong cadence is relevant, respectful, multi-touch, and disciplined enough that good prospects do not disappear because the rep failed to continue the conversation.$content$);

INSERT INTO public.nl_training_questions (chapter_id,module_id,question_type,quiz_level,question_text,options,correct_index,explanation)
SELECT c.id,c.module_id,'chapter_quiz',q.quiz_level,q.question_text,q.options::jsonb,q.correct_index,q.explanation
FROM public.nl_training_chapters c
CROSS JOIN (VALUES
(1,'What is the primary output of a BDR?','["Busy activity","Qualified opportunity","Long sales presentations","Closed won contracts"]',1,'The BDR creates qualified opportunities by opening and qualifying early conversations.'),
(1,'Which behavior best reflects BDR ownership?','["Waiting for perfect leads","Logging only booked meetings","Managing follow-up and next steps","Blaming the market after rejection"]',2,'Ownership means controlling preparation, outreach, tracking, and follow-through.'),
(1,'Why are clear CRM notes important?','["They replace live conversations","They help the closer continue with context","They make the pipeline look larger","They reduce the need for qualification"]',1,'Good notes preserve context and improve handoff quality.'),
(2,'A prospect says no on the first call. What is the best interpretation?','["The rep failed","The market is bad","It is one data point in the probability game","The lead must be deleted"]',2,'A single no is information, not a complete verdict.'),
(2,'What makes personalization effective?','["Mentioning any generic fact","Connecting a real observation to a business issue","Writing the longest possible email","Using the prospect name repeatedly"]',1,'Relevant personalization links an observation to a possible outcome.'),
(2,'What should a follow-up touch do?','["Say just checking in","Add context or make reply easier","Pressure the prospect","Repeat the exact same pitch"]',1,'Useful follow-up adds a reason to respond or advances the next step.'),
(3,'A BDR notices a lead has strong fit but no current urgency. What is the best action?','["Ignore forever","Mark as nurture with a future date","Force a meeting","Change the industry"]',1,'Good fit without immediate timing belongs in nurture, not in the trash.'),
(3,'What is the best handoff standard?','["Send every interested person","Hide objections from the closer","Capture pain, context, timing, and concerns","Only write the phone number"]',2,'A strong handoff gives the closer useful context and preserves trust.'),
(3,'Why does cadence matter?','["It guarantees every prospect buys","It prevents one-and-done prospecting","It removes the need for research","It replaces live calls"]',1,'Cadence keeps relevant follow-up happening across time and channels.')
) q(quiz_level,question_text,options,correct_index,explanation)
WHERE c.module_id IN (m1,m2);

FOR mod_id IN SELECT id FROM public.nl_training_modules WHERE track_id=bdr_track AND module_number IN (1,2) LOOP
INSERT INTO public.nl_training_questions (chapter_id,module_id,question_type,quiz_level,question_text,options,correct_index,explanation) VALUES
(NULL,mod_id,'module_test',1,'What does professional BDR activity balance?','["Volume and judgment","Hope and guessing","Pressure and speed","Silence and waiting"]'::jsonb,0,'Professional BDR work requires enough volume and enough judgment to create qualified opportunity.'),
(NULL,mod_id,'module_test',1,'Which metric is closest to true BDR output?','["Number of open tabs","Qualified meetings or opportunities","Minutes spent researching","How many scripts were memorized"]'::jsonb,1,'Qualified opportunities are the revenue-relevant output.'),
(NULL,mod_id,'module_test',1,'What should happen after every meaningful prospect interaction?','["Wait to see if they remember","Log context and the next step","Delete the lead","Send a generic pitch"]'::jsonb,1,'CRM discipline protects follow-up and handoff quality.'),
(NULL,mod_id,'module_test',1,'What is the best reason to research a prospect?','["To avoid outreach","To create a relevant first touch","To build a perfect biography","To fill time"]'::jsonb,1,'Research should produce relevance and action.'),
(NULL,mod_id,'module_test',1,'What makes a cadence professional?','["Relevant, respectful, and planned","Random and aggressive","One message only","Identical messages everywhere"]'::jsonb,0,'Professional cadence is structured and adapted to context.');
END LOOP;
END $$;