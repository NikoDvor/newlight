-- BDR Training: Module 7 Part 2 (Chapters 6-10 + Questions) + Module 8

DO $$

DECLARE

  m7 UUID := '4457d2a3-a291-489e-be00-f319f4012eb3';

  m8 UUID := 'f8a8a8a8-0009-4000-8000-000000000009';

  c7_1 UUID; c7_2 UUID; c7_3 UUID; c7_4 UUID; c7_5 UUID;

  c7_6 UUID; c7_7 UUID; c7_8 UUID; c7_9 UUID; c7_10 UUID;

  c8_1 UUID; c8_2 UUID; c8_3 UUID;

BEGIN

  -- Clean up any existing Module 7 chapters 6-10 and their questions

  DELETE FROM public.nl_training_questions WHERE module_id = m7 AND chapter_id IN (

    SELECT id FROM public.nl_training_chapters WHERE module_id = m7 AND chapter_number BETWEEN 6 AND 10

  );

  DELETE FROM public.nl_training_chapters WHERE module_id = m7 AND chapter_number BETWEEN 6 AND 10;

  -- Clean up any existing Module 8 chapters 1-3 and their questions

  DELETE FROM public.nl_training_questions WHERE module_id = m8 AND chapter_id IN (

    SELECT id FROM public.nl_training_chapters WHERE module_id = m8 AND chapter_number BETWEEN 1 AND 3

  );

  DELETE FROM public.nl_training_chapters WHERE module_id = m8 AND chapter_number BETWEEN 1 AND 3;

  -- Also clean module_test questions for m7 in case they exist from a prior run

  DELETE FROM public.nl_training_questions WHERE module_id = m7 AND question_type = 'module_test';

  SELECT id INTO c7_1 FROM public.nl_training_chapters WHERE module_id = m7 AND chapter_number = 1;

  SELECT id INTO c7_2 FROM public.nl_training_chapters WHERE module_id = m7 AND chapter_number = 2;

  SELECT id INTO c7_3 FROM public.nl_training_chapters WHERE module_id = m7 AND chapter_number = 3;

  SELECT id INTO c7_4 FROM public.nl_training_chapters WHERE module_id = m7 AND chapter_number = 4;

  SELECT id INTO c7_5 FROM public.nl_training_chapters WHERE module_id = m7 AND chapter_number = 5;

  INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content)

  VALUES (m7, 6, 'The Customer Onboarding Experience', 'Understand what happens after a deal is closed and how to set accurate expectations with prospects.',

$content$

THE CUSTOMER ONBOARDING EXPERIENCE

A BDR who understands onboarding sets better expectations, earns more trust during the sales conversation, and reduces friction after the close. You do not need to run onboarding. You need to understand it well enough to speak to it confidently.

WHAT HAPPENS AFTER THE CLOSE

Once a client signs on with NewLight, they move into an onboarding sequence. The goal of onboarding is to get the system live and producing results as quickly as possible while making the client feel organized and confident in the partnership.

THE ONBOARDING STEPS

INTAKE AND KICKOFF

The client completes an intake process that captures everything needed to set up their system — business information, target customer profile, current marketing situation, login credentials, branding assets, and goals. A kickoff call is scheduled to align on priorities and timeline.

SYSTEM SETUP

The NewLight platform is configured specifically for the client. Their CRM is organized, their pipeline stages are mapped to how their business actually sells, and their communication templates are set up.

CHANNEL ACTIVATION

Based on the services the client enrolled in, the active channels are launched. Ads go through a build and launch process. Social content is planned and scheduled. SEO foundations are set. The website is audited or built.

FIRST RESULTS WINDOW

The client is walked through what to expect in the first 30 to 60 days. Results from ads can appear quickly. SEO and AI visibility take longer. CRM results depend on how consistently the client uses the system.

CHECK-IN CADENCE

NewLight maintains regular check-in communication with clients so they always know what is happening, what the numbers look like, and what is being optimized.

HOW TO USE THIS AS A BDR

When a prospect asks "what happens after I sign up?" you should have a confident, clear answer. Walk them through the process above in plain language. It removes the mystery of what they are buying and increases confidence in the decision.

CHAPTER TAKEAWAY

Clients who understand what they are walking into are easier to close and more likely to stay.

$content$) RETURNING id INTO c7_6;

  INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content)

  VALUES (m7, 7, 'The App — What It Does & How to Explain It', 'Learn the NewLight app from the client perspective — what it gives them, what problems it solves, and how to describe it without getting technical.',

$content$

THE APP — WHAT IT DOES AND HOW TO EXPLAIN IT

The NewLight app is the control center of the client's growth system. It is what makes everything visible, connected, and manageable from one place. As a BDR, you are not explaining how to build it — you are explaining what it does for the owner.

WHAT THE APP GIVES THE CLIENT

ONE PLACE FOR EVERYTHING

Instead of checking five different platforms, logging into multiple tools, and losing track of leads across texts, emails, and voicemails — the client has one app on their phone and desktop where everything lives. Leads come in here. Follow-ups go out from here. The calendar lives here. The reports live here.

VISIBILITY INTO THE BUSINESS

Most owners have a gut feeling about how their business is doing. The app gives them actual data. They can see how many leads came in this week, what happened to each one, which channel is performing, and where the bottlenecks are. This visibility turns gut instinct into informed decisions.

A SYSTEM THAT WORKS WHILE THEY WORK

The app runs automations in the background — following up with leads, sending reminders, moving contacts through the pipeline based on what they do. The owner is delivering their service while the system handles the follow-up that most owners are too busy to do manually.

HOW TO EXPLAIN IT IN THE FIELD

Do not open with technical terms. Say this instead:

"Think of it like a command center for your business. You open it up, and you can see every lead that came in, what happened to each one, where your money is going, and what is booked on your calendar. Everything in one place instead of scattered everywhere. And the system does a lot of the follow-up automatically so you are not chasing people down yourself."

WHAT MAKES IT DIFFERENT FROM GENERIC SOFTWARE

The app is not a generic tool the client figures out on their own. It is set up for their business specifically — their pipeline, their services, their customers. That is the difference between a tool and a system.

CHAPTER TAKEAWAY

The app is not a feature — it is the infrastructure that makes everything else work. Explain it from the owner's perspective: what they see, what it saves them, and what it does while they are not watching.

$content$) RETURNING id INTO c7_7;

  INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content)

  VALUES (m7, 8, 'Growth Services Deep Dive', 'Go deeper on each of the five services so you can speak to them with confidence during client conversations.',

$content$

GROWTH SERVICES DEEP DIVE

This chapter gives you the working knowledge to speak confidently about each NewLight service when a prospect asks a pointed question. You are becoming fluent enough that you never get caught off guard.

CRM IN DEPTH

The CRM is the operating layer underneath all growth activity. Without it, leads get lost. With it, every prospect has a status, a next step, and an owner. The CRM tracks where each lead came from, what was said, what needs to happen, and when. Automations handle follow-up sequences, appointment reminders, and re-engagement campaigns. For a service business owner, this means they stop losing the leads they are already paying to generate.

PAID ADS IN DEPTH

NewLight runs paid advertising primarily on Google and Meta. Google captures demand — people actively searching for the service. Meta creates demand — showing the business to people who match the profile of a buyer before they are searching. Both are used strategically based on the client's market. NewLight handles audience targeting, budget allocation, creative, copy, and ongoing optimization. The client does not need to touch it.

SOCIAL MEDIA MANAGEMENT IN DEPTH

Social media is a trust channel. When someone hears about a business, the first thing they do is look it up online. If the page looks dead, unprofessional, or inconsistent, trust drops before a conversation ever happens. NewLight creates content, maintains the posting schedule, and manages engagement. The client's brand stays active and credible without them having to think about it.

SEO AND AI VISIBILITY IN DEPTH

SEO means showing up organically when people search for what you offer in your area — Google search, Google Maps, and local directories. AI visibility is the next layer — making sure the business is recommended when someone asks an AI assistant where to find a local service. Both compound over time. A business with strong SEO today is harder to displace six months from now.

WEB DESIGN AND MANAGEMENT IN DEPTH

A website's job is to convert visitors into leads. NewLight builds websites designed around that goal — clear service explanations, fast load times, compelling calls to action, and a design that builds immediate credibility. Sites are maintained and updated over time so they do not become stale or technically broken. For many small businesses, the website NewLight builds is the best marketing asset they have ever had.

CHAPTER TAKEAWAY

Knowing each service at this level means you never have to say "I will have to get back to you." Confidence in the product closes more conversations.

$content$) RETURNING id INTO c7_8;

  INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content)

  VALUES (m7, 9, 'Selling Points & Competitive Positioning', 'Understand what makes NewLight different and how to position it against competitors, past agencies, and DIY approaches.',

$content$

SELLING POINTS AND COMPETITIVE POSITIONING

Every prospect you talk to has either worked with another agency, tried to do it themselves, or is skeptical because someone they know had a bad experience. Your job is not to trash the competition. Your job is to position NewLight clearly enough that the prospect can see the difference themselves.

THE STRONGEST SELLING POINTS

INTEGRATED SYSTEM, NOT A COLLECTION OF VENDORS

Most small businesses that have tried marketing end up with a patchwork of disconnected services. Nothing talks to each other. Nothing is accountable to the whole. NewLight is one integrated system where every channel feeds the same pipeline and every result is tracked in the same place.

BUILT FOR SERVICE BUSINESSES SPECIFICALLY

NewLight does not serve e-commerce brands or SaaS companies. The system, the approach, and the results framework are built specifically for businesses that sell a service and need a calendar full of appointments. Generic agencies apply generic strategies. NewLight applies what actually works for the client's category.

ACCOUNTABILITY TO OUTCOMES

Most agencies charge a management fee and report on activity — impressions, clicks, reach. NewLight measures what actually matters: leads generated, appointments booked, revenue unlocked. That is what the client cares about.

SPEED TO IMPACT

The onboarding process is designed to get the system live and producing as fast as possible. Quick wins build confidence; the long-term system builds compounding results.

POSITIONING AGAINST COMMON OBJECTIONS

"I ALREADY HAVE SOMEONE DOING MY MARKETING."

"That might be working great. What we often find is that even businesses with some marketing in place are missing a connected system — leads come in but do not get followed up, or ads run but there is no CRM to capture and convert them. Worth a quick conversation to see if there are gaps."

"I TRIED AN AGENCY BEFORE AND IT DID NOT WORK."

"That is one of the most common things we hear. Most agencies charge for activity, not results. What is different about NewLight is the whole system is built around one outcome — filling your calendar with qualified appointments."

"I WILL JUST DO IT MYSELF."

"A lot of owners start there. The challenge is time — marketing done right is a full-time job on top of the full-time job of running the business. We take it completely off your plate so you can stay in your lane."

CHAPTER TAKEAWAY

You are not selling against competitors. You are selling clarity. The clearer you are about what NewLight does differently, the easier the decision becomes.

$content$) RETURNING id INTO c7_9;

  INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content)

  VALUES (m7, 10, 'ROI & Results Framing', 'Learn how to frame NewLight services in terms of real business outcomes and connect cost to revenue potential.',

$content$

ROI AND RESULTS FRAMING

The most effective way to handle price is to never let it stand alone. Every time a prospect looks at what NewLight costs, your job is to make sure they are also looking at what it produces. That is results framing.

THE FUNDAMENTAL SHIFT

Stop thinking in terms of cost. Start thinking in terms of return. A business that spends money on NewLight and acquires five new clients per month at an average ticket of one thousand dollars per client has generated five thousand dollars in new monthly revenue. If NewLight costs fifteen hundred dollars a month, the math is obvious. Your job is to help the prospect run that math.

HOW TO FRAME IT

Lead with the value of a customer. "Before we talk numbers on our end — what is a new client worth to you on average? Just a rough number." Once they tell you, you have the anchor. Everything NewLight costs is measured against that number.

Then connect the service to the outcome. "If the campaign brings in just five qualified leads a month and you close two of them at your average ticket, that is X in new revenue. Our cost is Y. That is not an expense — that is leverage."

Do not promise specific numbers. Frame it as a model. "I cannot guarantee exactly what your numbers will look like, but I can show you how the math tends to work for businesses similar to yours."

THE ROI CONVERSATION BY CHANNEL

CRM: "How many leads do you think you have lost in the last year just from slow follow-up? The CRM makes sure every lead gets contacted fast and followed up consistently. That alone recovers revenue most businesses do not know they are losing."

ADS: "Paid ads are the fastest way to generate leads on demand. When they are working, the cost per lead is predictable and the calendar fills. When they are not working, it is usually a strategy problem — not a platform problem."

SEO: "SEO takes longer to build but it does not stop when you stop paying. Every month it compounds. A year from now the same investment is delivering more leads at a lower effective cost."

WEB: "If your website is converting two percent of visitors and we get it to four percent, you have doubled your leads without spending another dollar on ads. That is free growth."

CHAPTER TAKEAWAY

Price without context feels expensive. Price in the context of return feels like an investment. Always anchor cost to outcome.

$content$) RETURNING id INTO c7_10;

  INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content)

  VALUES (m8, 1, 'Define Your Goals', 'Set clear, dated goals that will live on your homescreen and keep you accountable every single day.',

$content$

DEFINE YOUR GOALS

The difference between a wish and a goal is a deadline. Most people walk around with things they want without ever writing them down, giving them a date, or committing to them out loud. This chapter is where that changes.

WHY GOALS MATTER IN THIS ROLE

A BDR without a goal is just making dials. A BDR with a goal is building something. The daily activity — the calls, the rejections, the conversations — all of it means something different when it connects to a target you actually care about.

HOW TO SET A GOAL THAT STICKS

Be specific. Not "I want to make more money." Write: "I will earn $6,000 this month by booking 20 qualified appointments." Specific goals give you something to measure against. Vague goals disappear.

Give it a deadline. Every goal you set here will have a due date. That date is not decorative — it creates urgency. A goal without a deadline is a suggestion to yourself.

Make it stretch but reachable. A goal that is too easy does not motivate you. A goal that is impossible breaks you. Find the number that makes you a little uncomfortable but that you can actually hit if you work for it.

THE EXERCISE

Write your top goal right now. Not your top ten. The one. The goal that if you hit it this month would change something for you. Give it a due date. Be honest about what hitting it would mean.

Your goal will appear on your homescreen with a countdown timer. Every time you open the app, you will see it. That is intentional. The goal should be impossible to forget.

CHAPTER TAKEAWAY

A written goal with a deadline is a commitment. Own it.

$content$) RETURNING id INTO c8_1;

  INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content)

  VALUES (m8, 2, 'Your Why', 'Define the reason behind the work — the thing that keeps you going when the work gets hard.',

$content$

YOUR WHY

Motivation based on external pressure does not last. Motivation connected to something personal is almost impossible to extinguish. This chapter is about finding yours.

WHAT IS A WHY

Your why is the reason you show up. It is not "because I need money." It is what the money represents. It is the specific person, situation, feeling, or future you are working toward.

For some people it is family. For others it is independence. For others it is proving something to themselves or escaping a situation they refuse to stay in. There is no wrong answer. There is only honest and dishonest.

THE QUESTION TO ANSWER

Why does this work matter to you personally — not professionally? If nobody was watching, if no manager was measuring you, if you could stop tomorrow with no consequences — why would you still show up?

Write the real answer. Not the polished one.

HOW IT SHOWS UP

Your why will appear on your homescreen during your morning. Small. Not intrusive. A quiet reminder before the day starts of what all of this is actually for.

On the hardest days — the ones where nothing is working, the calls are going nowhere, and you feel like quitting — your why is the thing that brings you back. Remind yourself of it before you decide anything.

CHAPTER TAKEAWAY

Tactics can be taught. Drive comes from within. Know your why before you need it.

$content$) RETURNING id INTO c8_2;

  INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content)

  VALUES (m8, 3, 'The Life You''re Building', 'Define the life you want, break it into steps, and understand that the plan to get there starts with how you perform today.',

$content$

THE LIFE YOU ARE BUILDING

Most people live the life they ended up with. A small number of people live the life they designed. The difference is not luck. It is clarity, planning, and execution.

THE VISUALIZATION

Before you can build something, you have to be able to see it. Close your eyes and picture what your life looks like two years from now if everything goes the way you want it to. What do you drive? Where do you live? What does your day look like? Who is around you? How do you feel when you wake up?

Now write it down. Not as a fantasy — as a target. Describe it in detail.

FROM VISION TO PLAN

A vision without a plan is a daydream. Once you have the picture, work backwards.

What needs to be true in one year for the two-year vision to be reachable?

What needs to be true in six months for the one-year milestone to be on track?

What needs to happen this month?

What does this week need to look like?

What has to happen today?

When you follow that chain all the way down, today's work — the calls, the conversations, the follow-ups — connects directly to the life you described. That changes everything about how you approach the shift.

THE HONEST TRUTH

The life you are living right now is the result of the choices you made before. The life you will be living in two years is being determined by the choices you make today. You are not stuck. You are not a victim of your circumstances. You are one decision away from starting to build something different.

The plan is here. The steps are yours to write. The execution is the only variable left.

CHAPTER TAKEAWAY

You do not drift into the life you want. You build it deliberately, one shift at a time. Start today.

$content$) RETURNING id INTO c8_3;

  INSERT INTO public.nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation) VALUES

  (c7_6, m7, 'chapter_quiz', 1, 'What is the goal of the NewLight onboarding process?', '["To train the client on marketing strategy","To get the system live and producing results as fast as possible while building client confidence","To collect the first invoice payment","To negotiate a long-term contract"]'::jsonb, 1, 'Onboarding is about speed to impact and building the client relationship from day one.'),

  (c7_6, m7, 'chapter_quiz', 1, 'What happens during the intake and kickoff phase?', '["The client starts running their own ads immediately","Business information, goals, branding, and credentials are collected and a kickoff call aligns on priorities","The BDR takes over the account","The website goes live the same day"]'::jsonb, 1, 'Intake captures everything needed to configure the system. Kickoff aligns expectations and priorities.'),

  (c7_6, m7, 'chapter_quiz', 1, 'Which channel typically shows the fastest initial results after onboarding?', '["SEO — it shows results in the first week","Social media posting","Paid ads — they can generate leads within days of launch","Web design changes"]'::jsonb, 2, 'Paid ads can produce results quickly once live. SEO and AI visibility take months to compound.'),

  (c7_6, m7, 'chapter_quiz', 2, 'Why should a BDR understand the onboarding process even though they do not run it?', '["So they can manage client accounts post-close","So they can set accurate expectations during the sale — prospects trust reps who explain what comes next","So they can charge a higher price","So they can skip the closer step"]'::jsonb, 1, 'A BDR who can walk a prospect through what happens after they sign builds trust and reduces pre-close anxiety.'),

  (c7_6, m7, 'chapter_quiz', 2, 'A prospect asks "how long until I see results?" What is the most accurate and honest answer?', '["Guaranteed results in week one","Paid ads can show results in the first few weeks. SEO and AI take months to compound. The system starts building from day one but timelines vary by channel","Results always take at least one full year","We cannot make any prediction about results"]'::jsonb, 1, 'Honest channel-specific timeline expectations reduce churn and build long-term trust.'),

  (c7_6, m7, 'chapter_quiz', 2, 'What does the check-in cadence provide for the client?', '["A regular opportunity to cancel","Ongoing visibility into what is happening, the numbers, and what is being optimized — so the client never feels left in the dark","Monthly invoice reminders","Free service upgrades"]'::jsonb, 1, 'Proactive communication is a retention tool. Clients who feel informed stay longer.'),

  (c7_6, m7, 'chapter_quiz', 3, 'A skeptical prospect says "every agency says they set everything up quickly." How do you differentiate?', '["Agree that everyone says that and move on","Walk them through the specific steps — intake, system configuration, channel activation, first check-in. Specificity separates a real process from a sales promise","Offer a faster timeline than you can deliver","Tell them NewLight is faster than any competitor"]'::jsonb, 1, 'Specificity is credibility. Vague promises sound like everyone else; a detailed process sounds like a real system.'),

  (c7_6, m7, 'chapter_quiz', 3, 'Why does a clean onboarding process matter for the BDR relationship with clients?', '["It does not — the BDR is completely done after the close","A smooth onboarding validates the sale the BDR made. Clients who have a good experience are more likely to refer and renew","It means the BDR earns a higher bonus","It reduces the client price"]'::jsonb, 1, 'BDR reputation is tied to client outcomes. Good onboarding starts with accurate expectations set during the sale.'),

  (c7_6, m7, 'chapter_quiz', 3, 'A prospect burned before wants to know what accountability looks like post-close. What is the best response?', '["Just trust us — we have a great team","Regular check-ins, real reporting on what the numbers show, and a clear record of what was promised and what is being delivered — the system is transparent by design","We have been in business for many years","We have a satisfaction guarantee"]'::jsonb, 1, 'Accountability is demonstrated through process transparency, not reassurances.');

  INSERT INTO public.nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation) VALUES

  (c7_7, m7, 'chapter_quiz', 1, 'What is the simplest description of what the NewLight app gives a client?', '["A social media scheduling tool","One place for every lead, follow-up, calendar event, and report — everything in one app instead of scattered across platforms","An email marketing platform","A standalone website builder"]'::jsonb, 1, 'The app consolidates the entire growth system into one place.'),

  (c7_7, m7, 'chapter_quiz', 1, 'What does the app allow an owner to see that most business owners cannot see?', '["Their competitor pricing","Real data on leads, pipeline activity, channel performance, and bookings — replacing gut feeling with actual visibility","Their employees GPS locations","Their bank account balance"]'::jsonb, 1, 'Visibility into data is one of the most compelling value propositions for owners running on gut instinct.'),

  (c7_7, m7, 'chapter_quiz', 1, 'What makes the NewLight app different from off-the-shelf software?', '["It is cheaper","It is configured specifically for the client business — not a generic template they have to figure out themselves","It has the most features","It runs on a proprietary operating system"]'::jsonb, 1, 'The app is deployed and configured for the specific business, not handed over as a generic tool to set up independently.'),

  (c7_7, m7, 'chapter_quiz', 2, 'A prospect already uses QuickBooks and spreadsheets. How does the BDR frame the app?', '["Tell them QuickBooks is the wrong tool","Their current setup works for accounting — the NewLight app works for growth. It handles leads, follow-up, and bookings in real time so nothing falls through the cracks","Suggest they add more spreadsheet tabs","Tell them to switch their accounting software"]'::jsonb, 1, 'Do not compete with their existing tools — position the app as additive and growth-specific.'),

  (c7_7, m7, 'chapter_quiz', 2, 'What does "the system does a lot of the follow-up automatically" mean to an overwhelmed owner?', '["They still send all messages manually","Leads get followed up without the owner having to remember, manually text, or chase people — it runs in the background while they work","The owner delegates follow-up to staff","They need to log in every hour to check"]'::jsonb, 1, 'Automation addresses the time pain directly. The app works while the owner works.'),

  (c7_7, m7, 'chapter_quiz', 2, 'A prospect is intimidated by technology. How should a BDR present the app?', '["Tell them it is complicated but worth learning","Focus on what they see and what it saves them — not how it works. As simple as checking your phone to see what is happening in your business","Walk them through every technical feature","Tell them their staff will use it and they never have to log in"]'::jsonb, 1, 'Lead with the user experience and the value, not the technology. Simplicity beats sophistication.'),

  (c7_7, m7, 'chapter_quiz', 3, 'A prospect says they do not need an app because they already use multiple tools. What is the strongest counter?', '["Agree and move on","Multiple disconnected tools are a symptom of the problem — when lead data lives in five places, things fall through the cracks. The app consolidates everything so nothing is lost","Offer to integrate with all their tools","Tell them their current tools are outdated"]'::jsonb, 1, 'The fragmented tool stack is not a strength — it is the root of the follow-up and visibility problem.'),

  (c7_7, m7, 'chapter_quiz', 3, 'Why is "configured for your business" meaningful over off-the-shelf software?', '["Off-the-shelf software is always free","Generic tools require the client to build everything themselves. A configured system means they are set up to produce from day one with no learning curve","It is a marketing claim with no substance","It means they get more features"]'::jsonb, 1, 'Configuration reduces time-to-value and removes the failure mode of tools that sit unused because they were too hard to set up.'),

  (c7_7, m7, 'chapter_quiz', 3, 'A highly analytical prospect asks how the app tracks ROI across channels. What is the correct BDR response?', '["Tell them we cannot track that yet","The app shows where each lead came from, what happened to it, and which channel is producing the best results — so the owner can see the return on every dollar being spent","Defer entirely to a closer","Tell them ROI takes a full year to measure"]'::jsonb, 1, 'Multi-channel attribution and pipeline visibility are features the analytical prospect will respond to.');

  INSERT INTO public.nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation) VALUES

  (c7_8, m7, 'chapter_quiz', 1, 'What is the primary function of CRM in the NewLight system?', '["Design marketing creative","Track every lead, interaction, and next step while automating follow-up so no lead is lost","Schedule social media posts","Run paid ad campaigns"]'::jsonb, 1, 'CRM is the operating layer that ensures every lead is captured, tracked, and followed up without manual effort.'),

  (c7_8, m7, 'chapter_quiz', 1, 'What is the core difference between how Google and Meta ads work?', '["They are the same platform with different names","Google captures active search demand — people already looking. Meta creates demand by reaching people who match the buyer profile before they search","Meta is only for video content","Google is only for e-commerce companies"]'::jsonb, 1, 'Understanding the strategic difference helps BDRs recommend the right channel for the prospect situation.'),

  (c7_8, m7, 'chapter_quiz', 1, 'What does NewLight fully handle so the client does not need to manage their paid ads?', '["Nothing — the client manages their own campaigns","Strategy, targeting, creative, copy, budget allocation, and ongoing optimization","Only the graphic design portion","Only the billing and invoicing"]'::jsonb, 1, 'Full ad management is part of the service. The client does not need to become a marketer.'),

  (c7_8, m7, 'chapter_quiz', 2, 'A prospect says they post on Instagram occasionally. How does a BDR explain why that is not enough?', '["Tell them Instagram does not work for service businesses","Occasional posting does not build trust or consistency. Prospects check social before engaging — a sporadic feed raises doubts. NewLight creates a content plan that keeps the business looking alive and professional","Tell them to post more themselves daily","Suggest switching entirely to TikTok"]'::jsonb, 1, 'Consistency and professionalism on social are trust signals. Sporadic posting is often worse than a clean maintained presence.'),

  (c7_8, m7, 'chapter_quiz', 2, 'Why is SEO described as a long-game channel?', '["Because it takes a long time to set up technically","Because results compound over months — authority builds gradually and traffic does not stop when ad spend stops","Because it requires more budget than any other channel","Because it only works for large established businesses"]'::jsonb, 1, 'SEO builds compounding value over time. The investment made today delivers returns months and years later.'),

  (c7_8, m7, 'chapter_quiz', 2, 'What is the job of the website NewLight builds for a client?', '["To look impressive at trade shows","To convert visitors into leads — not just look good, but move people from awareness to action","To rank number one on Google within the first month","To replace the need for a sales team entirely"]'::jsonb, 1, 'A website is a conversion tool. Its success is measured in leads generated, not design awards.'),

  (c7_8, m7, 'chapter_quiz', 3, 'A prospect is running ads but says their leads do not convert. Which NewLight service most likely solves this?', '["Run bigger ad campaigns","CRM — the leads are probably not being followed up fast enough or consistently enough. Acquisition is working; conversion is broken","More social media content","A completely new website"]'::jsonb, 1, 'Leads that do not convert point to a follow-up and pipeline problem. CRM is the fix.'),

  (c7_8, m7, 'chapter_quiz', 3, 'A prospect has strong word-of-mouth but no online presence. What is the most strategic starting point?', '["Just run ads immediately","Website plus SEO — build the credibility layer first so when people search or get referred, what they find online validates the referral","Social media posting only","CRM setup only"]'::jsonb, 1, 'Credibility infrastructure before paid demand generation is the right sequence for a business with no online presence.'),

  (c7_8, m7, 'chapter_quiz', 3, 'A prospect asks why they need social media management if they are already running ads. How does a BDR explain the relationship?', '["They do not — ads are completely sufficient","Ads drive traffic; social builds the trust that makes people act on what they find. When someone sees an ad and checks the Instagram page, that page either validates or kills the deal","Social media completely replaces the need for ads","They are entirely separate and have no relationship"]'::jsonb, 1, 'Channel integration is key. Ads create attention, social creates trust. Both are needed.');

  INSERT INTO public.nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation) VALUES

  (c7_9, m7, 'chapter_quiz', 1, 'What is the strongest structural selling point of NewLight compared to using multiple vendors?', '["It is always cheaper than multiple vendors","One integrated system where every channel feeds the same pipeline and is accountable to the same outcome","It is easier to cancel when needed","It has more total employees working on the account"]'::jsonb, 1, 'Integration and unified accountability are structural advantages that fragmented vendor stacks cannot offer.'),

  (c7_9, m7, 'chapter_quiz', 1, 'Why does NewLight specializing in service businesses matter to a prospect?', '["It limits who they can serve","Specificity means the system and strategy are calibrated to what actually works for service businesses — not a generic approach","It means they charge higher prices","It means fewer features available"]'::jsonb, 1, 'Specialization is credibility. A focused agency that knows the client category is more trusted than a generalist.'),

  (c7_9, m7, 'chapter_quiz', 1, 'What does "accountability to outcomes" mean as a selling point?', '["NewLight guarantees every client makes money","NewLight measures performance by leads and appointments — not activity metrics like impressions and clicks","NewLight gives full refunds if unhappy","NewLight reports results weekly by default"]'::jsonb, 1, 'Outcome accountability separates NewLight from agencies that charge for activity and hide behind vanity metrics.'),

  (c7_9, m7, 'chapter_quiz', 2, 'A prospect says they already have someone doing their social media. How does a BDR respond without dismissing the current situation?', '["Tell them their current person is probably wrong","Ask what they are getting from it and whether it connects to their lead pipeline. If social is disconnected from the growth system, it may look good but not produce revenue","Tell them to fire their current person immediately","Agree and end the conversation"]'::jsonb, 1, 'The question is not whether they have someone — it is whether it is producing outcomes. Diagnose before dismissing.'),

  (c7_9, m7, 'chapter_quiz', 2, 'A prospect says they tried ads before and they did not work. What is the correct competitive response?', '["Ads do not work for every business","Most failed ad experiences come from poor strategy or no follow-up system. NewLight connects ads directly to a CRM pipeline and measures results, not impressions","Tell them to try again with a larger budget","Avoid the topic entirely"]'::jsonb, 1, 'Reframe the failure as a strategy and system problem, not a channel problem. Then position NewLight as the accountable alternative.'),

  (c7_9, m7, 'chapter_quiz', 2, 'A prospect says they will just do their marketing themselves. What is the competitive position?', '["That sounds like a great plan","DIY marketing requires learning platforms, creating content, managing campaigns, analyzing data, and staying current — all while running the business. NewLight does all of that so the owner can stay in their lane","Agree and offer a referral","Tell them it is easy to learn online"]'::jsonb, 1, 'The cost of DIY is time and distraction from the business. Frame NewLight as staying-in-your-lane infrastructure.'),

  (c7_9, m7, 'chapter_quiz', 3, 'A prospect has worked with three agencies and been disappointed by all three. How do you position NewLight?', '["Criticize all the previous agencies","Acknowledge the pattern — that is a real frustration. Then explain what is structurally different: one system, real accountability, outcomes measured in leads and bookings not reports","Tell them this time will definitely be different without explaining why","Offer the lowest possible price"]'::jsonb, 1, 'Empathy plus structural explanation is the formula. Show the difference, do not just claim it.'),

  (c7_9, m7, 'chapter_quiz', 3, 'Why is "speed to impact" especially meaningful for skeptical prospects?', '["Skeptical prospects only care about low prices","Skeptical prospects have waited a long time for results that never came. Fast early wins rebuild trust and demonstrate that NewLight operates differently from day one","Speed does not matter to skeptical prospects","It reduces the contract term"]'::jsonb, 1, 'For burned prospects, fast tangible results are the trust bridge. Speed to impact addresses the core fear.'),

  (c7_9, m7, 'chapter_quiz', 3, 'A prospect is comparing NewLight to a cheaper freelancer. How do you justify the difference?', '["Tell them cheap always means bad quality","A freelancer does one thing. NewLight does everything in an integrated system. Cheaper per service, but managing three freelancers costs time, coordination, and produces worse results than one connected system","Offer to match the freelancer price","Tell them freelancers are unreliable by nature"]'::jsonb, 1, 'The comparison is not NewLight versus one freelancer — it is one system versus a fragmented stack. Total cost of ownership shifts the frame.');

  INSERT INTO public.nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation) VALUES

  (c7_10, m7, 'chapter_quiz', 1, 'What is the fundamental shift a BDR must make when discussing price?', '["Always lead with discounts","Stop thinking in cost and start framing in return — price makes sense in the context of what it produces","Always mention price last in every conversation","Never mention price on the first call"]'::jsonb, 1, 'Price without context feels expensive. Price alongside return feels like leverage.'),

  (c7_10, m7, 'chapter_quiz', 1, 'What question anchors the ROI conversation before discussing NewLight cost?', '["How much do you want to spend on marketing?","What is a new client worth to you on average?","What is your current monthly revenue?","How many employees do you currently have?"]'::jsonb, 1, 'Getting the prospect to name client value sets the anchor. Everything NewLight costs is then measured against that number.'),

  (c7_10, m7, 'chapter_quiz', 1, 'For the CRM channel, what revenue is being recovered through better follow-up?', '["Revenue from new advertising campaigns","Leads that are already coming in but being lost through slow or no follow-up — existing revenue going uncaptured","Revenue from entirely new markets","Revenue that only comes from referrals"]'::jsonb, 1, 'CRM ROI is often framed as recovered revenue — money the business is already leaving on the table.'),

  (c7_10, m7, 'chapter_quiz', 2, 'A prospect says NewLight costs too much. What is the correct results framing response?', '["Offer a discount immediately","Anchor to the value of one new client, then show the math — if two clients per month are acquired at their average ticket, what does that cost per acquisition look like versus what NewLight charges","Agree and lower the price","Explain all the features again in more detail"]'::jsonb, 1, 'The cost objection is a context problem. Add the return context and the objection changes shape.'),

  (c7_10, m7, 'chapter_quiz', 2, 'Why should a BDR avoid promising specific ROI numbers?', '["Because results are always bad","Because results depend on market, service, and execution — promising numbers creates false expectations. Frame as a model, not a guarantee","Because it is legally prohibited","Because it makes the price seem lower than it is"]'::jsonb, 1, 'Honest framing builds trust. Use the model to show how the math could work, not to guarantee specific outcomes.'),

  (c7_10, m7, 'chapter_quiz', 2, 'What is the SEO ROI framing for a prospect focused on short-term returns?', '["SEO has no measurable ROI","The investment compounds — what is spent today delivers more leads at a lower cost-per-lead over time. A year from now the same investment is working harder","SEO guarantees page one rankings","SEO is only cost-effective for large companies"]'::jsonb, 1, 'SEO ROI is a compounding story, not an immediate one. Frame it as infrastructure, not an ad campaign.'),

  (c7_10, m7, 'chapter_quiz', 3, 'A prospect demands an ROI guarantee. How does a BDR respond confidently and honestly?', '["Offer a full money-back guarantee","We cannot guarantee specific numbers because results depend on your market and how consistently the system is used. What we can show you is how the math typically works for businesses like yours","Refuse to discuss ROI entirely","Tell them to check online reviews for proof"]'::jsonb, 1, 'Honest accountability without a false guarantee is actually more credible than an over-promise.'),

  (c7_10, m7, 'chapter_quiz', 3, 'If a website converts 2% of visitors and NewLight gets it to 4%, what happened from a business standpoint?', '["The website got more expensive to maintain","The business doubled its lead volume from the same traffic without spending more on ads — free growth from an infrastructure improvement","The ads automatically improved","The CRM started working better"]'::jsonb, 1, 'Conversion rate improvement is multiplicative. Frame it as leveraging existing traffic, not adding new spend.'),

  (c7_10, m7, 'chapter_quiz', 3, 'An analytical prospect wants to see a model before deciding. What is the correct BDR move?', '["Tell them there is no model available","Walk them through the client value anchor — what is a new client worth, how many per month would justify the investment, what does that look like at a 30% close rate. Then offer to have a closer walk through the specifics","Avoid the math entirely","Send them a PDF brochure and follow up later"]'::jsonb, 1, 'Analytical prospects respond to the math. Guide them through the model and transition to the closer for specifics.');

  INSERT INTO public.nl_training_questions (module_id, question_type, quiz_level, question_text, options, correct_index, explanation) VALUES

  (m7, 'module_test', 1, 'What are the two core things NewLight does for every client?', '["Design logos and run events","Organize the backend and fill the calendar with qualified appointments","Provide staffing and accounting","Build apps and run employee training"]'::jsonb, 1, 'Every NewLight engagement starts with backend organization and ends with calendar results.'),

  (m7, 'module_test', 1, 'Which of the five channels builds compounding value over time without ongoing spend?', '["Paid ads on Google","Social media posts","SEO and AI visibility","CRM pipeline setup"]'::jsonb, 2, 'SEO compounds. Paid ads stop producing when spend stops.'),

  (m7, 'module_test', 1, 'What question should a BDR ask first to set up the ROI conversation?', '["What is your monthly revenue target?","What is a new client worth to you on average?","How many employees do you currently have?","What is your current monthly marketing budget?"]'::jsonb, 1, 'The client value anchor is the foundation of every ROI framing conversation.'),

  (m7, 'module_test', 1, 'What is the strongest BDR response to a prospect who was burned by a previous agency?', '["Tell them that agency must have been bad","Acknowledge the frustration and explain what is structurally different about NewLight — one system, real accountability, outcomes in leads and bookings not vanity metrics","Offer a free month upfront","Ask them who the previous agency was"]'::jsonb, 1, 'Empathy plus structural differentiation builds trust after a bad experience.'),

  (m7, 'module_test', 1, 'A prospect understands the product but says the price is too high. What is the correct frame?', '["Offer an immediate discount","Reframe price as return — anchor to client value, show the math on what two to five new clients per month produces versus what NewLight costs","List all the features again in detail","Tell them pricing is completely non-negotiable"]'::jsonb, 1, 'Price objections are context problems. The return frame resolves them without discounting.');

END $$;