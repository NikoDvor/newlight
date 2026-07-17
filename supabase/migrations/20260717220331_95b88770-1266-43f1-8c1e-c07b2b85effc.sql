
ALTER TABLE public.nl_training_flashcards DROP CONSTRAINT IF EXISTS nl_training_flashcards_track_key_check;
ALTER TABLE public.nl_training_flashcards
  ADD CONSTRAINT nl_training_flashcards_track_key_check
  CHECK (track_key IN ('bdr','sdr','salesmen'));

ALTER TABLE public.nl_training_certifications DROP CONSTRAINT IF EXISTS nl_training_certifications_track_key_check;
ALTER TABLE public.nl_training_certifications
  ADD CONSTRAINT nl_training_certifications_track_key_check
  CHECK (track_key IN ('bdr','sdr','salesmen'));

UPDATE public.nl_training_tracks
SET track_key = 'salesmen',
    track_name = 'Salesmen Training Track',
    description = 'Unified sales training covering both BDR (appointment setter) and SDR (closer) roles.'
WHERE track_key = 'bdr';

DELETE FROM public.nl_training_tracks WHERE track_key = 'sdr';

DELETE FROM public.nl_training_modules
WHERE id IN (
  '9d1ac34e-a067-49aa-9352-e1e536a91aa1',
  'f8a8a8a8-0009-4000-8000-000000000009'
);

UPDATE public.nl_training_modules
SET module_number = module_number + 100
WHERE track_id = (SELECT id FROM public.nl_training_tracks WHERE track_key = 'salesmen');

UPDATE public.nl_training_modules SET module_number = 1, module_title = 'Role',
  module_description = 'Your role as a salesman — what you sell, how we deliver, and what the day looks like.', is_locked = false
WHERE id = 'd040a99d-36f1-45fa-8e8a-b633541fea36';
UPDATE public.nl_training_modules SET module_number = 2, module_title = 'Product Knowledge',
  module_description = 'What we sell and how to explain it — top-level overview plus dive-deeper detail on every part of the offer.', is_locked = false
WHERE id = '4457d2a3-a291-489e-be00-f319f4012eb3';
UPDATE public.nl_training_modules SET module_number = 3, module_title = 'Lead Generation & Prospecting',
  module_description = 'Who you call and how relentlessly you follow up.', is_locked = false
WHERE id = '6d2b61d4-d99f-4044-9ec6-212549acda55';
UPDATE public.nl_training_modules SET module_number = 4, module_title = 'Sales Fundamentals',
  module_description = 'Communication, tonality, paraverbal & body language, mining & discovery — the core sales craft.', is_locked = false
WHERE id = '3c2d03cb-d649-4528-ac3d-84cb930eeb12';
UPDATE public.nl_training_modules SET module_number = 5, module_title = 'Script Mastery',
  module_description = 'The scripts you run every day, plus the Financial Firm script.', is_locked = false
WHERE id = 'c48dc95d-60b1-4c33-bb54-f9685192a926';
UPDATE public.nl_training_modules SET module_number = 6, module_title = 'Objection Handling',
  module_description = 'Isolate first, then handle — the full objection framework.', is_locked = false
WHERE id = '49e85e03-72b0-4297-95ec-03d60f7db51c';
UPDATE public.nl_training_modules SET module_number = 8, module_title = 'Closing Techniques',
  module_description = 'Every close in the arsenal — option, question, assumptive, urgency, summary, takeaway, vision.', is_locked = false
WHERE id = '54a8980b-c59f-4123-a84f-4bed6cdc904c';

INSERT INTO public.nl_training_modules (track_id, module_number, module_title, module_description, is_locked)
SELECT id, 7, 'Meeting Cadences',
       'The exact cadence and script for Meeting 1 (Discovery) and Meeting 2 (Final Closing).', false
FROM public.nl_training_tracks WHERE track_key = 'salesmen';

DELETE FROM public.nl_training_chapters WHERE module_id = 'd040a99d-36f1-45fa-8e8a-b633541fea36';
INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content) VALUES
('d040a99d-36f1-45fa-8e8a-b633541fea36', 1, 'What You''re Selling', 'The one-sentence offer and who it''s for.',
$$# What You''re Selling

You''re selling AI-powered modern marketing systems to service-based businesses — the kind of company that lives or dies by new client flow.

**Our offer, in one sentence:** we bring businesses ready-to-buy customers, and we take on all the risk to do it.
$$),
('d040a99d-36f1-45fa-8e8a-b633541fea36', 2, 'How We Actually Do It', 'The six-step delivery model.',
$$# How We Actually Do It

1. **We build them a fully branded Command Center app** — their CRM, pipeline, calendar, and outreach system in one place.
2. **We ignite their visibility** with AI-powered SEO and content, on Google, AI search, and social.
3. **We launch paid ads, social, and outreach campaigns** engineered to convert into leads.
4. **We qualify every lead** — scored, nurtured, automated follow-up inside their Command Center.
5. **We maximize their close rate** with built-in CRM sequences.
6. **They run the company. Their system runs the growth.**
$$),
('d040a99d-36f1-45fa-8e8a-b633541fea36', 3, 'Zero Risk Offer', 'How we take on all the downside.',
$$# Zero Risk Offer

> We make their money back in 90 days, or we work for free until we do.

That is the offer. It is the single biggest reason prospects say yes. Memorize it word-for-word.
$$),
('d040a99d-36f1-45fa-8e8a-b633541fea36', 4, 'Your Tools, Day to Day', 'The dialer, CRM, and Command Center.',
$$# Your Tools, Day to Day

You''ll be working inside the dialer/CRM and the Command Center itself. Every call gets logged with a disposition in real time.

If it isn''t logged, it didn''t happen.
$$),
('d040a99d-36f1-45fa-8e8a-b633541fea36', 5, 'Your Day-to-Day Agenda', 'What the daily rhythm looks like.',
$$# Your Day-to-Day Agenda

- **Minimum 200 dials per day.**
- **Every call logged and dispositioned immediately** in the CRM.
- **Weekly one-on-one meeting with your manager.**
$$),
('d040a99d-36f1-45fa-8e8a-b633541fea36', 6, 'Compensation', 'How you get paid — role-specific.',
$$# Compensation

Your compensation depends on which role you''re running:

- **Appointment Setter (BDR):** 20% commission.
- **Closer (SDR):** 15% commission.
$$),
('d040a99d-36f1-45fa-8e8a-b633541fea36', 7, 'Expectations', 'The bar you''re expected to clear.',
$$# Expectations

- By month 2, **BDRs are expected to generate 5 appointments a day.**
- **Closers are expected to hit at least a 20% close rate.**
- That''s roughly **1 new client a day** by month 2 at those numbers.
$$);
DELETE FROM public.nl_training_questions WHERE module_id = 'd040a99d-36f1-45fa-8e8a-b633541fea36';

DELETE FROM public.nl_training_chapters WHERE module_id = '4457d2a3-a291-489e-be00-f319f4012eb3';
INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content) VALUES
('4457d2a3-a291-489e-be00-f319f4012eb3', 1, 'Product Knowledge — Top-Level Overview', 'The simple view — read this first, then dive deeper.',
$$# Product Knowledge — Top-Level Overview

Read this first. Each item below has a "Dive Deeper" chapter that expands on it.

## The Offer
We bring service-based businesses ready-to-buy customers — and take on all the risk to do it.

## How We Do It (six steps)
1. Build System
2. Ignite Visibility
3. Launch the Attack
4. Qualify Leads
5. Maximize Close Rate
6. Run the Growth

## Zero Risk Guarantee
We make their money back in 90 days, or we work for free until we do.

## Selling Points
- Zero risk 90-day guarantee, no fine print
- One system replaces every scattered tool
- AI-powered visibility most competitors aren''t doing
- Free branded demo app as a low-pressure next step for hesitant prospects
$$),
('4457d2a3-a291-489e-be00-f319f4012eb3', 2, 'Dive Deeper — The Offer', 'The full ROI-based model explained.',
$$# Dive Deeper — The Offer

We are an **ROI-based company.**

The client puts down the initial investment. We make it back for them first. We give ourselves **90 days** to do it.

Once the pipeline has generated that return, their retainer starts. **If we don''t hit it by day 90, we work for free until we do.**

That is the entire offer. The prospect isn''t risking money — they''re risking 90 days. If we deliver, they''re in profit. If we don''t, we keep working for free.
$$),
('4457d2a3-a291-489e-be00-f319f4012eb3', 3, 'Dive Deeper — How We Do It', 'The full explanation of all six steps.',
$$# Dive Deeper — How We Do It

## 1. Build System
We build them a **fully branded Command Center app**. It is their CRM, pipeline, calendar, team management, and outreach system — all in one place. No more paying five different SaaS subscriptions that don''t talk to each other.

## 2. Ignite Visibility
We turn on **AI-powered SEO and content** across Google, AI search (ChatGPT, Perplexity, etc.), and social platforms. Most competitors are still running SEO like it''s 2018 — we run it for the AI-search era.

## 3. Launch the Attack
We launch **paid ads, social campaigns, and outreach** engineered to convert into leads. This includes the rep-driven human outreach layer (that''s you) — cold and warm calling to business owners who fit the target profile.

## 4. Qualify Leads
Every lead is **scored, nurtured, and follow-up-automated** inside the Command Center. No lead sits and rots.

## 5. Maximize Close Rate
Built-in CRM sequences — reminders, follow-up cadences, meeting reschedules, review requests — so the close rate on the leads we generate is as high as it can be.

## 6. Run the Growth
**They run the company. Their system runs the growth.** Owners get out of the marketing rabbit hole and back into running the actual business.
$$),
('4457d2a3-a291-489e-be00-f319f4012eb3', 4, 'Dive Deeper — Zero Risk Guarantee', 'How to explain it in a live sales conversation.',
$$# Dive Deeper — Zero Risk Guarantee

When a prospect pushes back with "I don''t trust you can actually do this," this is your answer.

> "You don''t trust that we can make this happen — I understand. I''m actually glad you brought this up. This is actually the backbone of how our company separates from our competitors. Our core offer actually eliminates the risk.
>
> We are an ROI-based company. You put down the initial investment, and we make it back for you first. Once your pipeline has generated that return — and we give ourselves 90 days to do it — your retainer starts. If we don''t hit it by day 90, we work for free until we do."

For the full objection response in context, see **Module 6 → "I Just Don''t Trust That You Can Make This Happen."**
$$),
('4457d2a3-a291-489e-be00-f319f4012eb3', 5, 'Dive Deeper — Selling Points', 'The expanded list of why we win.',
$$# Dive Deeper — Selling Points

- **Zero risk 90-day guarantee, no fine print.** We eat the risk. If we don''t hit ROI in 90 days, we work for free until we do.
- **One system replaces every scattered tool** they''re paying for now — CRM, pipeline, calendar, team management, conversations. All in one branded app.
- **AI-powered visibility** most competitors aren''t doing. We''re playing the SEO game on the version that comes next, not the version everyone else is stuck on.
- **Free branded demo app** as a low-pressure next step for hesitant prospects. If they''re not ready to sign, we can still put a real, working, branded version of their app in their hands to prove it.
$$),
('4457d2a3-a291-489e-be00-f319f4012eb3', 6, 'Dive Deeper — How We Get Ahold of Clients', 'You are the human outreach layer.',
$$# Dive Deeper — How We Get Ahold of Clients

**Outbound calling — cold and warm — to business owners who fit the target profile.**

The rep IS the human outreach layer. You are the literal first step of "we launch the attack." Ads and content generate some inbound; you generate the rest by dialing.

That''s why the dial minimum matters. That''s why every call gets logged. Your dials are the raw fuel for step 3 of the delivery model.
$$);

UPDATE public.nl_training_chapters SET chapter_number = chapter_number + 10
WHERE module_id = '6d2b61d4-d99f-4044-9ec6-212549acda55';
INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content) VALUES
('6d2b61d4-d99f-4044-9ec6-212549acda55', 1, 'Why This Module Matters More Than Any Other', 'A great script means nothing pointed at the wrong list.',
$$# Why This Module Matters More Than Any Other

A great script means nothing pointed at the wrong list.

This module is about **who you''re calling** and **how relentlessly you follow up with them** — not just finding leads once.

The best salesman in the world with a bad list will lose to a mediocre salesman with a great list. Read that twice.
$$),
('6d2b61d4-d99f-4044-9ec6-212549acda55', 2, 'The Lead Scraping Process', 'Placeholder — master prompt coming in a follow-up update.',
$$# The Lead Scraping Process

*[Content pending — master prompt for lead scraping to be added in a follow-up update.]*
$$),
('6d2b61d4-d99f-4044-9ec6-212549acda55', 3, 'The Follow-Up Multiplier', 'Reps who follow up 3x their results.',
$$# The Follow-Up Multiplier

Most reps call a lead once, get no answer, and move on.

**That is the single biggest leak in this entire system.**

Reps who call back and follow up properly **3x their results** compared to reps who don''t.

A lead that didn''t pick up on call 1 is not a dead lead — it''s an **unfinished** one.

Treat every non-connect as a scheduled callback, not a dismissal. That single mindset shift is worth more than any script you''ll ever memorize.
$$);
DELETE FROM public.nl_training_questions WHERE module_id = '6d2b61d4-d99f-4044-9ec6-212549acda55';

UPDATE public.nl_training_chapters SET chapter_title = 'Paraverbal & Body Language'
WHERE module_id = '3c2d03cb-d649-4528-ac3d-84cb930eeb12' AND chapter_title = 'Body Language & Presence';
UPDATE public.nl_training_chapters SET chapter_title = 'Mining & Discovery'
WHERE module_id = '3c2d03cb-d649-4528-ac3d-84cb930eeb12' AND chapter_title = 'Mining the Conversation';

INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content)
VALUES ('c48dc95d-60b1-4c33-bb54-f9685192a926', 4, 'Financial Firm Script',
'The gatekeeper + owner + voicemail script for financial firm outreach.',
$$# Financial Firm Script

## Gatekeeper

> "Hey, this is [company''s name], right?"

> "I believe [owner''s name] should be there — I was relayed over to talk to [owner''s name]. What''s his schedule look like today?"

**[If asked why]**
> "Well, I talked to Charlotte and was sent over to him."

**[If asked who that is]**
> "She was an old friend of [owner''s name] — a client back in the day. She speaks highly of [him/her]."

**[If asked why again]**
> "I need to move over 2 clients and wanted to set up a quick call. If you can get me in tomorrow evening, you would be a hero. Do mornings, afternoons, or evenings work best for [owner''s name]?"

---

## Owner

> "Hey, [owner''s name]?"

> "I was just checking in on your availability in [August]."

> "I''m looking to move over around 15 clients to you. Would you be able to handle them?"

> "Well, I''m gonna bring you 15 clients — I was just calling to set up a 15-minute Zoom to show you exactly how we do that."

> "There seems to be a lot of people searching for [niche] in [city], and I see other businesses popping up and grabbing that attention. I''d love to steal you for 15 minutes to show you exactly how we take that attention and point it at you, to bring you more clients instead."

> "Does mornings, afternoons, or evenings work better for you?"

---

## Voicemail line

> "Hello, I was sent over to talk to [owner''s name]. Get back to me at [your phone number]. Thank you and have a great day."
$$);

UPDATE public.nl_training_chapters SET chapter_number = chapter_number + 10
WHERE module_id = '49e85e03-72b0-4297-95ec-03d60f7db51c';
INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content) VALUES
('49e85e03-72b0-4297-95ec-03d60f7db51c', 1, 'Pro Tip — Isolate Objections First', 'Read this before any individual objection.',
$$# Pro Tip — Isolate Objections First

Before you handle any objection, **be proactive**. Isolate the objection(s) first to set up the close.

> "So if we were to solve [restate their exact problem] — there would be no other reason to move along, correct?"

**(Acknowledge the objection)**

> "Okay — if we were to resolve this, on a scale of 1 to 10 — 1 being you''re going to come beat me up, 10 being you want to move forward with the service today — where are you at?"

**(They give a number, e.g., 3)**

> "Okay, so what would it take to get you from a 3 to a 10?"

Once the objection is isolated and handled this way, you''re set up to **close and onboard them effortlessly**. Do this every single time. Skip it and you''ll be arguing with a moving target.
$$),
('49e85e03-72b0-4297-95ec-03d60f7db51c', 2, 'Objection — I Don''t See the Value', 'SDR close + BDR pattern interrupt.',
$$# Objection — "I Don''t See the Value"

## SDR Close
> "I understand you don''t see the value — can I ask a question?"
> "Do you not see the value in the modern marketing, or the AI?"
> "Well, {marketing / AI} aside — you would see the value of 10 clients, equating to approximately $35,000?"
> "So what''s really beneath this all?"

## BDR — Pattern Interrupt
> "I understand, you aren''t interested."

## BDR — Quick, to the point
> "Yeah, you''re not interested — I didn''t expect you to be interested in the first 20–30 seconds. We can put a pin in this and I''ll give you a call down the road. Before I do that, just so I''m proactive for when I call — what exactly are you not interested in, so I can be prepared?"
$$),
('49e85e03-72b0-4297-95ec-03d60f7db51c', 3, 'Objection — Not Interested', 'Pattern interrupt, resolve, and route back into conversation.',
$$# Objection — "Not Interested"

## Pattern Interrupt
> "Hey, [business owner''s name] — I hear you when you say you aren''t interested. But can I make a suggestion?"

## Resolve
> "Just out of curiosity — is it more about the timing, the pricing, or something we went over that doesn''t quite make sense?"
> "What about [issue] concerns you the most?" → back into conversation.

## BDR — Quick, to the point
> "Yeah, you''re not interested — I didn''t expect you to be interested in the first 20–30 seconds. So we can table this and I''ll give you a call down the road. Before I do that, just so I''m proactive for when I call — what exactly are you not interested in, so I can be prepared?"

## Bonus line
> "AI and marketing and everything set aside — would you be opposed to filling up your calendar in [next month]?"
$$),
('49e85e03-72b0-4297-95ec-03d60f7db51c', 4, 'Objection — Too Expensive', 'Pattern interrupt → resolve → add value → close.',
$$# Objection — "Too Expensive"

**Framework:** Pattern Interrupt (Tonality) → Resolve (Pacing) → Add Value → Close

## Pattern Interrupt
> "Alright [name], I know it''s out of your budget right now. But can I make a suggestion?"

## Resolve
> "What would be the more expensive option — the 30 thousand in missed revenue opportunity from those 15 clients, or the 10K you''re spending right now?"
> "Alright, I guess we''re on the same page now."

## Add Value / Ace
> "To make this work, let''s put together a payment plan. We''ll do 2 months at $4K/month, or 3 months at $3K/month — that way we essentially pay for ourselves."

## Close
> "What makes more sense to you — the 2-month or the 3-month plan?"

## Alternate / BDR version
> "Setting money aside — if the results were guaranteed, is this something you''d want?"
> **Yes:** "So the question is really the structure — is it the total amount, or would breaking it up differently make it more manageable?"
> **No:** return to discovery.
$$),
('49e85e03-72b0-4297-95ec-03d60f7db51c', 5, 'Objection — I Just Don''t Trust That You Can Make This Happen', 'The zero-risk offer, delivered live.',
$$# Objection — "I Just Don''t Trust That You Can Make This Happen"

> "You don''t trust that we can make this happen — I understand. I''m actually glad you brought this up. This is actually the backbone of how our company separates from our competitors. Our core offer actually eliminates the risk."

**Explain the offer:**

> "We are an ROI-based company. You put down the initial investment, and we make it back for you first. Once your pipeline has generated that return — and we give ourselves 90 days to do it — your retainer starts. If we don''t hit it by day 90, we work for free until we do."

This objection is a **gift**. It''s the one that lets you deliver the single strongest thing we sell.
$$);

INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content)
SELECT m.id, 1, 'Meeting 1 — Discovery',
       'The full discovery cadence: rapport, screen share, qualifying questions.',
$$# Meeting 1 — Discovery

## Rapport

> "So here is the cadence for this call — I''m just going to give you some information about our company and what we do."
> "Then I''ll ask some questions to learn more about you and your company."
> "After that, I''ll open it up to you for any questions, comments, and concerns. Does that sound fair?"

**Screen share our website (newlightgen.com).** Walk them through everything up to our stats.

---

## Qualifying Questions

1. **Pipeline** — Where do your clients come from now — and in your opinion, is it enough to get you where you want to be?
2. **Volume** — About how many new client meetings are you booking a month right now?
3. **Economics** — What''s your close rate and average ticket for the clients you''re currently bringing in?
4. **Ceiling** — What''s stopping you from getting more clients? Is it leads, or time to chase them down?
5. **Capacity** — How much room do you have? If we brought in more appointments, would you even be able to fit them in?
6. **Stakes** — If nothing changed, would you be happy with your calendar a year from now?
7. **Cost of the gap** — If I told you exactly how many clients you''re losing every month to a competitor who shows up first when someone searches — what would that number need to be before it actually bothered you?
8. **Time cost** — How many hours a week are you personally spending trying to drum up new business that you''d rather be spending running the business?
   *(follow-up)* "I mean, most business owners are just marketers now-a-days — that''s not really what you signed up for, right?"
9. **Readiness / self-diagnosis** — If you had to guess — the real problem here to scale is getting more leads, close rate, or something else?

---

> **Note:** Form 2 (pricing model, initial fee, recurring fee/commission rate, internal closing notes) gets filled at the **end of this meeting** to schedule Meeting 2.
$$
FROM public.nl_training_modules m
JOIN public.nl_training_tracks t ON t.id = m.track_id
WHERE t.track_key = 'salesmen' AND m.module_number = 7;

INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content)
SELECT m.id, 2, 'Meeting 2 — Final Closing',
       'Reconnect, recap, present, price-confirm, handle, close, hand off.',
$$# Meeting 2 — Final Closing

## 1. Reconnect / Rapport
> "Hey [owner''s name], good to see you again. Last time we talked about [1-sentence recap of their specific pain point from discovery]. Since then I''ve put together exactly how we''d fix that for you. Sound good if I walk you through it?"

## 2. Recap Their Own Words
> "Just to make sure I''ve got this right — you told me [restate their discovery answers]. Does that still sound accurate, or has anything changed since we last spoke?"

## 3. Present the Offer
Walk through scope, initial fee (from Form 2), recurring fee / commission structure.

## 4. Price Confirmation
> "Based on what we talked about, we landed on [initial fee] to get started, with [recurring fee / commission structure]. Does that match what you remember from last time?"

## 5. Objection Handling
Use the **Pro Tip isolation technique** from Module 6 first, then route into whichever objection applies.

## 6. Close
**Option close:**
> "So would you like to get set up with the payment plan, or are you comfortable paying everything up front today?"

**If yes → Assumptive close:**
> "We need a time to set up the activation onboarding meeting — do mornings, afternoons, or evenings work best for you?"

## 7. Handoff
This is the moment the **activation trigger fires**:
- payment / invoice
- service agreement e-sign
- PM assignment
- kickoff Zoom
- welcome document

**Closing this meeting IS triggering that handoff.**
$$
FROM public.nl_training_modules m
JOIN public.nl_training_tracks t ON t.id = m.track_id
WHERE t.track_key = 'salesmen' AND m.module_number = 7;

INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content)
VALUES ('54a8980b-c59f-4123-a84f-4bed6cdc904c', 20, 'Every Close in the Arsenal',
'Option, question, assumptive, urgency, summary, takeaway, and vision closes — memorize them all.',
$$# Every Close in the Arsenal

## Option Close
> "So would you like to get set up with the payment plan, or are you comfortable paying everything up front today?"

## Question Close
> "Would you be opposed to moving forward with us today?"

## Assumptive Close
> "So based on everything we just went over — the leads, the [X hours a week], the [$Y] you''re leaving on the table every month — it doesn''t make sense to keep doing this the same way. Let''s get you started. We need a time to set up the activation onboarding meeting — do mornings, afternoons, or evenings work best for you?"

## Urgency / Scarcity Close
> "I can only take on a couple of new clients in [city] this month before we hit capacity for your area — do you want to lock in your spot today, or risk it going to someone else?"

## Summary Close
> "So just to recap — you''re losing about [X] clients a month, that''s roughly [$Y] walking out the door, and you don''t currently have a system to fix that. Does it make sense to start solving that today, or keep it the way it is?"

## Takeaway Close
> "Honestly, if you''re not ready to actually fix this, I don''t want to push you into something you''re not committed to — is this actually a priority for you right now, or is this a ''someday'' thing?"

## Emotional / Vision Close
> "Picture your calendar a year from now, full, with clients you didn''t have to chase down — is that worth getting started today?"
$$);

UPDATE public.nl_training_flashcards SET track_key = 'salesmen' WHERE track_key = 'bdr';
UPDATE public.nl_training_certifications SET track_key = 'salesmen' WHERE track_key = 'bdr';
