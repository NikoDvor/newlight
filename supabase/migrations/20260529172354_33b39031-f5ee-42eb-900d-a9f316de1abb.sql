-- BDR Training: Module 7 Part 1 (Chapters 1-5 + Questions)
DO $$
DECLARE
  m7 UUID := '4457d2a3-a291-489e-be00-f319f4012eb3';
  m8 UUID := 'd501cfaf-1d83-4471-97ae-e3f586423bb3';
  c7_1 UUID; c7_2 UUID; c7_3 UUID; c7_4 UUID; c7_5 UUID;
  c7_6 UUID; c7_7 UUID; c7_8 UUID; c7_9 UUID; c7_10 UUID;
  c8_1 UUID; c8_2 UUID; c8_3 UUID;
BEGIN
  UPDATE public.nl_training_modules
  SET module_title = 'Product Mastery & Client Onboarding',
      module_description = 'Everything a BDR needs to understand about NewLight — what we do, who we help, how the product works, how to explain it simply, and how to position it to close conversations.'
  WHERE id = m7;

  UPDATE public.nl_training_modules
  SET module_title = 'Mindset & The Life You''re Building',
      module_description = 'Set your goals, define your why, and map out the life you are working toward. This module is about you.'
  WHERE id = m8;

  DELETE FROM public.nl_training_questions WHERE module_id IN (m7, m8);
  DELETE FROM public.nl_training_chapters WHERE module_id IN (m7, m8);

  INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content)
  VALUES (m7, 1, 'NewLight Company Overview', 'Understand what NewLight does, who we help, and the mission behind the company.',
$content$
NEWLIGHT COMPANY OVERVIEW

NewLight Marketing exists to solve one of the most common problems that service-based business owners face: they are good at what they do, but they are losing revenue to businesses that are not.

WHAT WE DO

We partner with service-based companies — from local contractors and med spas to auto shops and professional services — and do two things. First, we clean up and organize the backend of their business by deploying a smart system that gives them visibility into what is working and what is not. Second, we go to work filling their calendar with qualified appointments using proven marketing strategies across ads, social media, SEO, and web.

WHO WE HELP

We work with service businesses that have one or more of these problems: they are not getting enough leads, they are getting leads but not converting them, they are too busy to manage their own marketing, or they have tried other agencies and been burned. These businesses have real revenue potential that is sitting untapped. Our job is to unlock it.

THE MISSION

The mission of NewLight is to take the stress of growth off the owner's plate and replace it with a system that runs. Owners should be able to focus on delivering their service. We handle the rest.

WHY THIS MATTERS AS A BDR

When you walk into a conversation with a prospect, you are not selling marketing. You are offering relief. You are talking to someone who is either overwhelmed, stuck, or frustrated with where their business is. Your job is to show them that there is a better way and that NewLight is the partner to help them get there.

CHAPTER TAKEAWAY

NewLight is a full-service growth partner for service businesses. We organize the backend and fill the calendar. Everything we offer connects back to that mission.
$content$) RETURNING id INTO c7_1;

  INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content)
  VALUES (m7, 2, 'What NewLight Is & How to Sell It', 'Learn the NewLight value proposition and how to present it in a way that creates immediate interest.',
$content$
WHAT NEWLIGHT IS AND HOW TO SELL IT

The most common mistake BDRs make when describing NewLight is going straight to features. Prospects do not care about features. They care about outcomes. Your job is to connect what NewLight does to what the business owner actually wants.

THE CORE VALUE PROPOSITION

NewLight gives service businesses a complete growth system. It starts with organization — putting the backend of the business in one place so the owner can see what is happening, what is not working, and where they are losing money. Then it activates growth — running the marketing channels that bring new customers in consistently.

HOW TO SELL IT

Sell the transformation, not the tool. A prospect does not need to understand how the platform works on day one. They need to feel that the problem they have been living with finally has a solution.

Lead with the problem. Before you explain what NewLight does, name the pain. "A lot of the businesses we work with are doing good work but losing jobs to competitors who are showing up first online." Let them react. If they recognize that problem, they will want to hear the solution.

Then position the solution. "What we do is put a system in place that makes sure those people find you first, and when they do, there is a process that converts them into paying customers."

Close with the next step. Do not over-explain. Get them to a conversation with a closer.

WHAT NOT TO DO

Do not lead with the app. Do not explain sub-accounts, platforms, or features in the first thirty seconds. Do not use agency jargon. If you sound like a salesperson reading a brochure, you have already lost.

CHAPTER TAKEAWAY

Sell the transformation. Lead with the problem, offer the solution, get the appointment.
$content$) RETURNING id INTO c7_2;

  INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content)
  VALUES (m7, 3, 'How to Explain It Simply', 'Master a clear, jargon-free explanation of NewLight that anyone can understand in under two minutes.',
$content$
HOW TO EXPLAIN IT SIMPLY

Most business owners are not marketers. If you use terms like CRM, funnel, retargeting, or automation in the first minute of a conversation, you will lose them. The ability to explain what NewLight does in plain language is one of the most important skills a BDR can develop.

THE TWO-SENTENCE VERSION

If someone asks what NewLight does, you should be able to answer in two sentences: "We help service businesses get more customers by setting up a system that organizes their backend and runs their marketing for them. Basically, we make sure the right people find them online and actually reach out."

That is it. Practice that until it feels natural coming out of your mouth.

THE THIRTY-SECOND VERSION

When you have a little more time: "So what we do is come in, clean up the backend of the business — put everything in one place so you can actually see what is going on — and then we run the marketing side. Ads, social, SEO, the website. The goal is simple: more qualified people coming through the door, more consistently. And the owner does not have to manage any of it."

AVOID THESE PHRASES IN EARLY CONVERSATIONS

"Sub-account deployment" — say "a system we set up specifically for your business."

"Marketing automation" — say "a process that follows up with leads automatically so nothing falls through the cracks."

"CRM" — say "a place where all your customer info and leads live in one spot."

"Funnel" — say "the path a customer takes from finding you to booking with you."

WHY THIS MATTERS

The simpler you explain it, the more credible you sound. Complexity signals confusion. Clarity signals confidence.

CHAPTER TAKEAWAY

If a business owner's spouse asked what you do, they should be able to understand it immediately. Train yourself to speak plainly.
$content$) RETURNING id INTO c7_3;

  INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content)
  VALUES (m7, 4, 'The Five Revenue Channels', 'Understand CRM, paid ads, social media management, SEO/AI visibility, and web design — what each one does and why it matters.',
$content$
THE FIVE REVENUE CHANNELS

NewLight offers five core services. Each one solves a specific gap in how a service business attracts, converts, and retains customers. As a BDR, you do not need to be an expert in every channel. You need to understand what each one does and why a prospect would need it.

1. CRM — CUSTOMER RELATIONSHIP MANAGEMENT

The CRM is the foundation. It is the system that holds all prospect and customer information, tracks every interaction, and automates follow-up. Most small service businesses have no CRM — they are running everything in their head, a notes app, or a spreadsheet. When leads fall through the cracks, it is almost always because there is no system in place to catch them. CRM fixes that.

2. PAID ADS

Paid advertising — primarily on Google and Meta — puts the business in front of people who are actively searching for the service or who match the profile of a buyer. Done right, paid ads are the fastest way to generate new leads. Done wrong, they burn money. NewLight manages the strategy, creative, targeting, and optimization so the client gets results without having to figure it out themselves.

3. SOCIAL MEDIA MANAGEMENT

Consistent social presence builds trust and keeps the business top of mind. Most owners know they should be posting but do not have the time or creative bandwidth to do it well. NewLight handles content creation, scheduling, and engagement so the business looks alive and professional across the platforms that matter to their audience.

4. SEO AND AI VISIBILITY

Search engine optimization ensures the business shows up when people search for what they offer in their area. AI visibility is the newer layer — making sure the business appears when people use AI tools like ChatGPT or voice search to find local services. This is a long-game channel that compounds over time and reduces dependence on paid ads.

5. WEB DESIGN AND MANAGEMENT

A website is often the first impression a prospect has of a business. If it is slow, outdated, or unclear, they leave. NewLight builds and manages high-converting websites that are designed to turn visitors into leads, not just look good.

CHAPTER TAKEAWAY

Each channel solves a specific problem. The most powerful outcomes happen when they work together as a system.
$content$) RETURNING id INTO c7_4;

  INSERT INTO public.nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content)
  VALUES (m7, 5, 'Pain Points & Selling Points', 'Learn the specific problems NewLight solves and the strongest reasons a prospect should say yes.',
$content$
PAIN POINTS AND SELLING POINTS

The best BDRs are not just product knowledgeable — they are pain knowledgeable. They know what keeps a service business owner up at night, and they know exactly how NewLight addresses it.

THE CORE PAIN POINTS

INCONSISTENT LEAD FLOW

Most service businesses have feast-or-famine revenue. Some months are slammed, others are dead. There is no system generating leads consistently. The owner relies on referrals, word of mouth, or luck. NewLight replaces that randomness with a repeatable pipeline.

INVISIBILITY ONLINE

If a business is not showing up on Google, maps, AI search tools, and social media, it does not exist to the customer who is looking right now. Competitors who are visible are taking business that should belong to this owner.

LEADS THAT GO NOWHERE

Many businesses generate some leads but lose them through slow follow-up, disorganization, or no follow-up process at all. A lead contacted within five minutes of inquiry is nine times more likely to convert. Most owners are following up hours later, if at all.

TIME OVERLOAD

Owners are operators. They are delivering the service, managing staff, handling problems, and running the business. Marketing is the last thing they have time to do well. And because it never gets prioritized, growth stalls.

BAD PAST EXPERIENCE WITH AGENCIES

A significant number of prospects have already been burned. They paid someone who delivered nothing and disappeared. Trust is low. This is not a reason to back off — it is an opportunity to position NewLight as the accountable alternative.

THE SELLING POINTS

ONE PARTNER FOR EVERYTHING

Instead of managing a web designer, a social media person, an SEO company, and an ads agency separately — NewLight handles all of it in one integrated system. Less management, more accountability, better results.

A SYSTEM BUILT FOR THEIR BUSINESS

The NewLight platform is not generic software. It is deployed specifically for the client's business, organized around their operations, and activated with their customers in mind.

RESULTS ACCOUNTABILITY

NewLight is outcome-focused. The goal is not to run ads. The goal is to fill the calendar. That focus on real deliverables is what separates us from agencies that charge for activity instead of results.

OWNERSHIP STAYS WITH THE CLIENT

The client owns their CRM data, their contacts, and their customer relationships. They are not renting a relationship from NewLight — they are building an asset.

SCALABLE AS THEY GROW

The system that works for a one-location business scales with them as they add locations, staff, or services. It is not a short-term fix — it is a long-term infrastructure.

CHAPTER TAKEAWAY

Know the pains cold. When you name a prospect's problem before they do, trust is built instantly.
$content$) RETURNING id INTO c7_5;

  INSERT INTO public.nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation) VALUES
  (c7_1, m7, 'chapter_quiz', 1, 'What type of businesses does NewLight primarily serve?', '["E-commerce brands","SaaS companies","Service-based businesses","Retail chain stores"]'::jsonb, 2, 'NewLight is built specifically for service-based businesses that need a calendar full of appointments.'),
  (c7_1, m7, 'chapter_quiz', 1, 'What are the two main things NewLight does for every client?', '["Build apps and train employees","Organize the backend and fill the calendar","Run social media and print ads","Design logos and write copy"]'::jsonb, 1, 'NewLight organizes the backend and fills the calendar with qualified appointments — every engagement starts there.'),
  (c7_1, m7, 'chapter_quiz', 1, 'What is the mission of NewLight Marketing?', '["To make owners dependent on software","To take the stress of growth off the owner and replace it with a system","To generate the most ad impressions possible","To replace the sales team entirely"]'::jsonb, 1, 'The mission is to remove growth stress from the owner and replace it with a system that runs.'),
  (c7_1, m7, 'chapter_quiz', 2, 'Why does a BDR need to understand the company mission?', '["To explain the technology in detail","To connect with the prospect at a pain level, not a feature level","To manage client accounts after the close","To set up the platform during onboarding"]'::jsonb, 1, 'Understanding the mission allows BDRs to speak to relief and transformation rather than features.'),
  (c7_1, m7, 'chapter_quiz', 2, 'Which of the following is a strong fit signal for a NewLight prospect?', '["A business with a full in-house marketing department","A business with inconsistent lead flow and no follow-up system","A brand new startup with no customers","A national franchise with 500 locations"]'::jsonb, 1, 'Inconsistent leads and no follow-up system is the pain NewLight solves.'),
  (c7_1, m7, 'chapter_quiz', 2, 'What does NewLight replace for a service business owner?', '["Their staff and operations team","Random referral-based growth with a repeatable system","Their need to deliver the service","Their accountant and bookkeeper"]'::jsonb, 1, 'NewLight replaces the randomness of referral-dependent growth with a consistent, systemized pipeline.'),
  (c7_1, m7, 'chapter_quiz', 3, 'A prospect says they stay busy from referrals and do not need marketing. What is the best BDR response using the NewLight mission?', '["Agree and move on","Referrals are great — the question is whether your growth is predictable or dependent on luck. We add a system that runs alongside referrals","Tell them referrals will dry up eventually","Ask if they run Google ads"]'::jsonb, 1, 'Referral dependence is a vulnerability. NewLight adds predictability on top of what they already have.'),
  (c7_1, m7, 'chapter_quiz', 3, 'What makes NewLight different from a generic marketing agency?', '["Lower prices","The system is purpose-built for service businesses and measured on appointments, not vanity metrics","They have more employees","They have won more awards"]'::jsonb, 1, 'Specificity to service businesses and accountability to real outcomes separates NewLight from generic agencies.'),
  (c7_1, m7, 'chapter_quiz', 3, 'A BDR describes NewLight as a software company. What is wrong with that framing?', '["Nothing — software is accurate","It misses the mission — NewLight is a growth partner, not a software vendor. Leading with software undersells the transformation","Software companies charge more","It will confuse the prospect immediately"]'::jsonb, 1, 'NewLight is a growth partner. Framing it as software reduces it to a product category the prospect may already be skeptical of.');

  INSERT INTO public.nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation) VALUES
  (c7_2, m7, 'chapter_quiz', 1, 'What is the most common mistake BDRs make when describing NewLight?', '["Speaking too slowly","Going straight to features instead of outcomes","Asking too many questions","Being too enthusiastic"]'::jsonb, 1, 'Leading with features loses prospects who care about outcomes, not how the product works.'),
  (c7_2, m7, 'chapter_quiz', 1, 'What should a BDR sell instead of product features?', '["The company history","The transformation — what the prospect gets, not how it works","The pricing tiers","The technical architecture"]'::jsonb, 1, 'Selling the transformation means speaking to outcomes: more leads, filled calendar, less stress.'),
  (c7_2, m7, 'chapter_quiz', 1, 'What is the correct sequence for presenting NewLight to a cold prospect?', '["Explain the platform, then ask if they are interested","Name the pain, present the solution, get the appointment","Lead with the close, then explain what they bought","Lead with price, then explain value"]'::jsonb, 1, 'Lead with the problem, offer the solution, secure the next step — in that order.'),
  (c7_2, m7, 'chapter_quiz', 2, 'Why should a BDR avoid explaining the app and platform features in the first 30 seconds?', '["It makes the call too short","Prospects are not buying technology — they are buying relief from a problem. Technical detail in the opening kills curiosity","It is confidential","It sounds too expensive"]'::jsonb, 1, 'Prospects need to feel understood before they want to understand the product.'),
  (c7_2, m7, 'chapter_quiz', 2, 'A prospect responds positively to the problem statement. What is the best next move?', '["Go deeper into platform features","Present the solution briefly and move toward booking a closer conversation","Read the full product overview","Ask for a credit card"]'::jsonb, 1, 'Interest in the problem earns the right to present the solution and move toward the appointment.'),
  (c7_2, m7, 'chapter_quiz', 2, 'What does leading with the problem accomplish in a sales conversation?', '["It makes the prospect defensive","It creates recognition and trust before the solution is offered","It shortens the call artificially","It removes the need to explain the product"]'::jsonb, 1, 'When a prospect recognizes their own problem in your words, they are far more receptive to the solution.'),
  (c7_2, m7, 'chapter_quiz', 3, 'A prospect says they already know what marketing agencies do. How should a BDR create genuine interest?', '["Agree and move to pricing","Position NewLight not as a marketing agency but as a growth system, then name the specific problem most agencies do not solve","Ask them who they are currently using","Offer a discount immediately"]'::jsonb, 1, 'Reframing the category creates distance from a commodity comparison and opens a new conversation.'),
  (c7_2, m7, 'chapter_quiz', 3, 'Why is price the wrong first topic in a NewLight conversation?', '["It is never relevant","Price without context feels expensive — it only makes sense after the prospect understands what they are getting and what it will produce","Prices are kept private","It will scare them off immediately"]'::jsonb, 1, 'Cost only makes sense in the context of return. Sequence matters: problem, solution, outcome, then price.'),
  (c7_2, m7, 'chapter_quiz', 3, 'A BDR names a pain and the prospect says "yeah, that is definitely an issue for us." What is the highest leverage response?', '["Celebrate the agreement and keep listing features","Anchor to that pain, bridge to the solution, and ask for five minutes to show them what the system looks like","Ask if they have a marketing budget","Tell them about other clients you have worked with"]'::jsonb, 1, 'Momentum from recognized pain should immediately bridge to the solution and the next step.');

  INSERT INTO public.nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation) VALUES
  (c7_3, m7, 'chapter_quiz', 1, 'What is the two-sentence version of what NewLight does?', '["We are a CRM and automation platform for enterprise clients","We help service businesses get more customers by setting up a system that organizes their backend and runs their marketing — so the right people find them and reach out","We build websites and run Facebook ads","We provide software licenses to small businesses"]'::jsonb, 1, 'The two-sentence version leads with outcome and avoids all jargon.'),
  (c7_3, m7, 'chapter_quiz', 1, 'What should a BDR say instead of the word CRM?', '["Automation hub","A place where all your customer info and leads live in one spot","Sales pipeline software","Backend integration layer"]'::jsonb, 1, 'Plain language replaces jargon without losing the meaning.'),
  (c7_3, m7, 'chapter_quiz', 1, 'Why does simpler explanation increase credibility?', '["It makes the call shorter","Complexity signals confusion — clarity signals confidence and mastery","It avoids hard questions","It makes you sound less experienced"]'::jsonb, 1, 'A BDR who explains things clearly is trusted more than one who hides behind complexity.'),
  (c7_3, m7, 'chapter_quiz', 2, 'A prospect asks "what exactly do you do?" mid-call. What is the best response?', '["Refer them to the website","Use the 30-second plain language version: organize the backend, run the marketing, fill the calendar — owner does not have to manage it","Launch into a full product walkthrough","Ask if they have seen your ads before"]'::jsonb, 1, 'A clean 30-second answer keeps the conversation moving and builds immediate credibility.'),
  (c7_3, m7, 'chapter_quiz', 2, 'What is wrong with saying "we handle marketing automation and funnel optimization"?', '["It is factually inaccurate","It is jargon the average owner does not understand — it creates distance instead of connection","It sounds too cheap","It reveals proprietary information"]'::jsonb, 1, 'Jargon forces the prospect to ask clarifying questions and signals you are more comfortable with the product than with the person.'),
  (c7_3, m7, 'chapter_quiz', 2, 'Instead of "marketing automation" what plain language alternative should a BDR use?', '["Advanced follow-up sequencing","A process that follows up with leads automatically so nothing falls through the cracks","Pipeline cadence management","Trigger-based nurture workflows"]'::jsonb, 1, 'Plain language creates connection. Technical language creates distance.'),
  (c7_3, m7, 'chapter_quiz', 3, 'A prospect says "I still do not really understand what you are selling." What went wrong and what should the BDR do?', '["The prospect is not a good fit — end the call","The explanation was too technical or feature-heavy — reset with the two-sentence version and ask what part is still unclear","Send them to the website","Ask them to call back when they have more time"]'::jsonb, 1, 'Confusion is a signal to simplify, not to repeat. Reset to plain language and check for understanding.'),
  (c7_3, m7, 'chapter_quiz', 3, 'Why is the spouse test useful for evaluating your explanation?', '["Spouses make all purchasing decisions","If a non-business person could understand it immediately, it is simple enough — clarity for a lay audience works for any audience","It is not a useful test","It tells you if the pricing is right"]'::jsonb, 1, 'The spouse test is a benchmark for plain language. If the explanation passes it, it will work for anyone.'),
  (c7_3, m7, 'chapter_quiz', 3, 'A BDR is explaining NewLight to a skeptical restaurant owner. What is the best opening line?', '["It is a CRM with integrated automation layers","Think of it like a command center for your business — you open it and see every lead, what happened to them, and what is booked, all in one place","We offer sub-account deployment for multi-location businesses","It is built on a white-label SaaS infrastructure"]'::jsonb, 1, 'Plain, visual language creates immediate understanding. Lead with what it looks and feels like from the inside.');

  INSERT INTO public.nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation) VALUES
  (c7_4, m7, 'chapter_quiz', 1, 'What is the primary role of the CRM in the NewLight system?', '["Run paid ads","Hold all prospect and customer information and automate follow-up","Design the website","Post to social media"]'::jsonb, 1, 'The CRM is the foundation — it tracks every lead, every interaction, and automates follow-up so nothing is lost.'),
  (c7_4, m7, 'chapter_quiz', 1, 'What does paid advertising on Google primarily capture?', '["People who have never heard of the business","Active demand — people already searching for the service","Social media engagement","Email newsletter subscribers"]'::jsonb, 1, 'Google captures existing demand from people actively searching. Meta creates demand by reaching look-alike audiences.'),
  (c7_4, m7, 'chapter_quiz', 1, 'Which NewLight channel compounds over time and reduces paid ad dependence?', '["Social media posting","Paid ads on Meta","SEO and AI visibility","CRM automation"]'::jsonb, 2, 'SEO builds authority over time and delivers traffic without ongoing spend, compounding value month over month.'),
  (c7_4, m7, 'chapter_quiz', 2, 'A prospect says they tried Facebook ads and lost money. Which channel should a BDR highlight as a sustainable long-term option?', '["Running more Facebook ads with a bigger budget","SEO and AI visibility — it builds over time and does not stop when you stop paying","Social media posting only","Adding a second CRM"]'::jsonb, 1, 'SEO is a long-game complement to paid ads. When ads fail, it often means the channel was the only thing driving leads.'),
  (c7_4, m7, 'chapter_quiz', 2, 'Why does social media management matter even if it does not directly generate leads?', '["It does not matter at all","It builds trust — prospects check social before deciding to engage, and an inactive page kills credibility before a conversation starts","It is required by the platform","It generates the most leads of any channel"]'::jsonb, 1, 'Social proof and consistency build trust. A dead social page raises doubts before a conversation even starts.'),
  (c7_4, m7, 'chapter_quiz', 2, 'What problem does the NewLight website solve for a service business?', '["It replaces the need for social media","It converts visitors into leads with clear messaging, fast load times, and strong calls to action","It manages the CRM database","It runs paid ads automatically"]'::jsonb, 1, 'A high-converting website maximizes all other marketing efforts by turning traffic into actual inquiries.'),
  (c7_4, m7, 'chapter_quiz', 3, 'A prospect only wants to run ads. How should a BDR frame the limitation of a single-channel approach?', '["Support their decision and just run ads","One channel is fragile — if ads get expensive or a platform changes, there is nothing else to fall back on. A system with multiple channels compounds and protects","Ads are the only channel that works anyway","Agree and book the appointment"]'::jsonb, 1, 'Single-channel dependence is a vulnerability. The system approach creates compounding and resilience.'),
  (c7_4, m7, 'chapter_quiz', 3, 'How should a BDR explain AI visibility relevance to a skeptical prospect?', '["Ignore it — it is not proven yet","More and more people are using AI assistants to find local services. Being visible there now is a competitive advantage most businesses are missing","It is only relevant for tech companies","It fully replaces SEO"]'::jsonb, 1, 'Early movers on AI visibility have a window to build presence before competitors catch on. Frame it as an underutilized opportunity.'),
  (c7_4, m7, 'chapter_quiz', 3, 'A business owner asks which channel would have the fastest impact on bookings. What is the honest answer?', '["SEO — it is the fastest channel","Paid ads generate leads fastest, but without CRM to capture and follow up, the leads are wasted. Both are needed to actually produce appointments","Social media posting alone","Web design — it is the highest converting"]'::jsonb, 1, 'Paid ads move fastest but require CRM to convert leads. Honest channel framing builds trust and sets correct expectations.');

  INSERT INTO public.nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation) VALUES
  (c7_5, m7, 'chapter_quiz', 1, 'What does inconsistent lead flow mean for a service business?', '["The business is growing too fast","Revenue is unpredictable — feast or famine with no system creating consistency","The owner needs more staff immediately","The business does not need marketing"]'::jsonb, 1, 'Feast-or-famine revenue is the result of no lead generation system. NewLight replaces that randomness.'),
  (c7_5, m7, 'chapter_quiz', 1, 'What is the strongest NewLight selling point for a time-overloaded owner?', '["It is cheaper than other agencies","One partner handles everything — ads, social, SEO, CRM, and web — without the owner managing any of it","They can learn marketing on YouTube","They should hire an in-house team"]'::jsonb, 1, 'Time-overloaded owners need to take something off their plate, not add something new.'),
  (c7_5, m7, 'chapter_quiz', 1, 'What does "ownership stays with the client" mean?', '["NewLight owns all the client data","The client owns their CRM data, contacts, and customer relationships — they are building an asset, not renting one","The client must manage their own account","The client owns the NewLight software license"]'::jsonb, 1, 'Client data ownership is a meaningful differentiator — clients are building long-term equity, not dependency.'),
  (c7_5, m7, 'chapter_quiz', 2, 'A prospect says leads come in but never convert. Which pain point is this and what is the solution?', '["Inconsistent lead flow — run more ads","Leads going nowhere — the CRM and follow-up automation convert leads before they go cold","Low visibility — improve SEO","Weak website — redesign immediately"]'::jsonb, 1, 'Unconverted leads point to a follow-up and CRM problem, not a lead volume problem.'),
  (c7_5, m7, 'chapter_quiz', 2, 'Why is a bad past agency experience an opportunity rather than a dead end?', '["It means the prospect has no remaining budget","It reveals distrust that can be addressed — positioning NewLight as outcome-focused and accountable counters what went wrong","It means they are not a good fit","It means they believe marketing does not work at all"]'::jsonb, 1, 'A burned prospect is primed to hear a different story. Accountability and outcomes are the differentiated message.'),
  (c7_5, m7, 'chapter_quiz', 2, 'What makes "one partner for everything" a compelling selling point?', '["It is always cheaper than doing it separately","It removes coordination burden — everything is integrated, everything is accountable to the same outcome, and the client manages one relationship","It is easier to cancel","It means less complexity for NewLight"]'::jsonb, 1, 'Integration and accountability create an experience that fragmented multi-vendor approaches cannot replicate.'),
  (c7_5, m7, 'chapter_quiz', 3, 'A prospect says they are already visible online and do not see the need for NewLight. How do you respond?', '["Agree — they probably do not need us","Visibility is step one — the question is whether visibility converts. If people find them but do not call, there is a conversion problem the system fixes","Ask if they run ads","Offer them a free consultation"]'::jsonb, 1, 'Visibility without conversion is still lost revenue. Reframe from awareness to pipeline outcomes.'),
  (c7_5, m7, 'chapter_quiz', 3, 'Which selling point is most relevant to a prospect who has tried to scale but keeps hitting a ceiling?', '["Lower pricing","Scalability — the NewLight system is built to grow with the business, adding locations, staff, and services without rebuilding from scratch","Faster onboarding","Better social media content creation"]'::jsonb, 1, 'Ceiling problems often come from outgrowing a patchwork approach. Scalable infrastructure is the answer.'),
  (c7_5, m7, 'chapter_quiz', 3, 'A prospect cites time as their reason for not engaging. What is the highest leverage response?', '["Tell them it does not take much of their time","Time overload is exactly why NewLight exists — the whole system runs without the owner managing it. You are not asking them to add work; you are offering to remove it","Suggest they hire a part-time marketer","Ask them to call back when they are less busy"]'::jsonb, 1, 'Time is the most common objection and one of the strongest pain points. Reframe NewLight as the solution to the problem they just named.');
END $$;