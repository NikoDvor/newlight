delete from nl_training_questions where module_id='49e85e03-72b0-4297-95ec-03d60f7db51c';
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$What is an objection?$q$, $q$["A signal that one thing is still unresolved", "A final no", "A reason to hang up", "An insult"]$q$::jsonb, $q$Find that one thing and solve it.$q$),
($q$What does RAC stand for?$q$, $q$["Recognize, Ask, Close forward", "Repeat, Argue, Convince", "Rebut, Answer, Call back", "Relax, Agree, Concede"]$q$::jsonb, $q$The only framework you need.$q$),
($q$What do you do before handling an objection?$q$, $q$["Isolate it — make sure it's the only thing in the way", "Drop the price", "Re-pitch the service", "Agree and hang up"]$q$::jsonb, $q$"If we solved that, is anything else stopping you?"$q$),
($q$A prospect says they're a 4 out of 10. What do you ask?$q$, $q$["\"What would get you from a 4 to a 10?\"", "\"Why so low?\"", "\"Are you sure?\"", "\"Should I call back?\""]$q$::jsonb, $q$Find the gap and close it.$q$),
($q$What's the right frame for an objection?$q$, $q$["You and the prospect vs. the problem", "You vs. the prospect", "The prospect vs. the price", "Nobody wins"]$q$::jsonb, $q$Collaborate, don't defend.$q$),
($q$Right after you solve an objection you…$q$, $q$["Move straight to the next step", "Pause and wait for them", "Ask if they're sure", "Re-explain the service"]$q$::jsonb, $q$The pause is where deals die.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=1;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$Why funnel different wordings into a core objection?$q$, $q$["So you can run the play you've practiced", "To confuse the prospect", "To avoid answering", "To end the call faster"]$q$::jsonb, $q$One answer per core objection, not a hundred.$q$),
($q$They say "We're all set." What's the core objection?$q$, $q$["Not interested", "Too expensive", "Need to talk to someone", "Compliance"]$q$::jsonb, $q$Name it: "you're not interested."$q$),
($q$They say "What would this even do for us?" Core objection?$q$, $q$["Don't see the value", "Need to think", "Send me info", "Already covered"]$q$::jsonb, $q$"I hear you — you don't see the value yet."$q$),
($q$What's step 2 of the funnel?$q$, $q$["Name it out loud in the core words", "Drop the price", "Hang up", "Send an email"]$q$::jsonb, $q$Hear it → name it → run the play.$q$),
($q$How do you pick the core objection?$q$, $q$["By what they mean, not their exact words", "By the first word they say", "Always pick 'not interested'", "Ask them to choose"]$q$::jsonb, $q$Meaning over wording.$q$),
($q$Why does naming it out loud help?$q$, $q$["They feel heard and you move onto ground you've practiced", "It's a trick", "It makes them angry", "It skips discovery"]$q$::jsonb, $q$Honest and effective.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=2;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$Why do owners say 'not interested' so fast?$q$, $q$["It's a reflex they use on every caller", "They've decided after research", "They hate marketing", "They're busy forever"]$q$::jsonb, $q$Nothing's decided yet.$q$),
($q$Best funnel line for 'We're good'?$q$, $q$["\"Totally fair — you're not interested. I didn't expect you to be in the first 30 seconds.\"", "\"Are you sure?\"", "\"You're making a mistake.\"", "\"Let me explain again.\""]$q$::jsonb, $q$Agree and name it.$q$),
($q$What's a strong follow-up question on the phone?$q$, $q$["\"Is it the timing, the cost, or you're happy with how clients come in now?\"", "\"Why not?\"", "\"Can I send a brochure?\"", "\"Who else should I call?\""]$q$::jsonb, $q$Three choices reveal the real objection.$q$),
($q$They say 'Take me off your list.' You…$q$, $q$["Agree, apologize, and mark the number Do Not Call", "Keep pitching", "Call back tomorrow", "Ask why"]$q$::jsonb, $q$Always respect it.$q$),
($q$'We get all our clients from referrals' — best question?$q$, $q$["\"How many came in last month — is that enough to hit your goal?\"", "\"Referrals don't work.\"", "\"Do you want ads?\"", "\"Okay, bye.\""]$q$::jsonb, $q$Find the gap.$q$),
($q$Which should you never do with 'not interested'?$q$, $q$["Re-pitch the service", "Name it", "Ask one question", "Book a callback"]$q$::jsonb, $q$Ask, don't tell.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=3;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$What does 'I don't see the value' really mean?$q$, $q$["The pitch hasn't connected to their own problem yet", "They hate us", "The price is too high", "They're not the owner"]$q$::jsonb, $q$Build the bridge.$q$),
($q$Best first response?$q$, $q$["\"What would 'valuable' actually look like for your firm?\"", "Repeat your pitch slower", "List every service", "Offer a discount"]$q$::jsonb, $q$Let them define value.$q$),
($q$How does an SDR show the value?$q$, $q$["Show the gap from their own Discovery numbers", "Guess their revenue", "Promise 20 clients", "Talk about other firms"]$q$::jsonb, $q$The gap is the value.$q$),
($q$What does the regret question do?$q$, $q$["Turns 'no value' into a trust question the guarantee solves", "Ends the call", "Lowers the price", "Insults them"]$q$::jsonb, $q$"What about that would you regret?"$q$),
($q$'We're doing fine.' Best question?$q$, $q$["\"Where do you want to be in 12 months — will what you have get you there?\"", "\"No you're not.\"", "\"Everyone says that.\"", "\"Can I send info?\""]$q$::jsonb, $q$Surface the gap.$q$),
($q$Which is never allowed here?$q$, $q$["Promising a number of clients or AUM", "Asking what value looks like", "Using their numbers", "Naming the objection"]$q$::jsonb, $q$Promise only the guarantee.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=4;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$What does 'I need to think about it' usually mean?$q$, $q$["Something specific is unresolved", "They'll think it over carefully", "They want a discount", "It's a yes"]$q$::jsonb, $q$Find it now.$q$),
($q$Best reframe?$q$, $q$["\"Decisions take information, not time — what would you be thinking over?\"", "\"Take all the time you need.\"", "\"I'll call you next month.\"", "\"Don't overthink it.\""]$q$::jsonb, $q$Make it about information.$q$),
($q$What do the three choices do?$q$, $q$["Let them name the real concern easily", "Pressure them", "End the call", "Skip discovery"]$q$::jsonb, $q$Timing, investment, or something that doesn't feel right.$q$),
($q$'Call me after tax season.' You…$q$, $q$["Ask what changes, then book a specific follow-up", "Agree and hang up", "Argue", "Never call again"]$q$::jsonb, $q$Never 'I'll call you'.$q$),
($q$Which is NOT allowed?$q$, $q$["Inventing a fake deadline or discount", "Asking what they'd think over", "Booking a follow-up", "Giving three choices"]$q$::jsonb, $q$No fake urgency.$q$),
($q$What happens to most 'I'll think about it' prospects you don't pin down?$q$, $q$["They get busy and forget", "They call back", "They sign later", "They refer friends"]$q$::jsonb, $q$Solve it on the call.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=5;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$Best response to 'I need to talk to my partner'?$q$, $q$["Get the partner on the next Zoom together", "Let them pitch it alone", "Send a brochure", "Give up"]$q$::jsonb, $q$Second-hand messages lose deals.$q$),
($q$How do you include the partner?$q$, $q$["Add them as an attendee on the meeting", "Ask for their personal cell", "Call them secretly", "Email the firm"]$q$::jsonb, $q$They get the invite and reminders.$q$),
($q$What does 'what will they push back on?' do?$q$, $q$["Finds the objection one layer back", "Insults the partner", "Ends the meeting", "Skips to price"]$q$::jsonb, $q$Handle it together now.$q$),
($q$'If it were only up to you, would you move forward?' — answer is no. That means…$q$, $q$["There's another objection — funnel into it", "Close anyway", "Hang up", "Offer a discount"]$q$::jsonb, $q$The partner wasn't the real issue.$q$),
($q$Which should you never do?$q$, $q$["Leave without a meeting booked with the other person", "Ask who else decides", "Add an attendee", "Name the objection"]$q$::jsonb, $q$Lock the next step.$q$),
($q$Funnel line for 'Our managing partner handles that'?$q$, $q$["\"That makes sense — you need to run it by them.\"", "\"Put them on now.\"", "\"Why don't you decide?\"", "\"Okay, goodbye.\""]$q$::jsonb, $q$Name it, then involve them.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=6;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$What is a price objection usually about?$q$, $q$["Doubt the money comes back", "Pure math", "Rudeness", "The weather"]$q$::jsonb, $q$Raise the value.$q$),
($q$What's the strongest answer to 'too expensive'?$q$, $q$["The 90-day guarantee", "An instant discount", "A longer pitch", "Silence forever"]$q$::jsonb, $q$We make it back first.$q$),
($q$How do you compare cost to doing nothing?$q$, $q$["Use the yearly gap from their own numbers", "Guess a big number", "Compare to other agencies", "Skip it"]$q$::jsonb, $q$Which is the more expensive option?$q$),
($q$If they'd want it but the structure worries them, you…$q$, $q$["Talk through the revenue-share vs. flat monthly options", "Lower the setup immediately", "End the call", "Promise more clients"]$q$::jsonb, $q$It's about structure.$q$),
($q$'What's your price?' asked in the first minute. Best move?$q$, $q$["Redirect to their goal before giving a number", "Say $25,000 and stop", "Refuse to answer ever", "Hang up"]$q$::jsonb, $q$Value before cost.$q$),
($q$Where does the agreed setup number go?$q$, $q$["Form 2 (Close Prep)", "A sticky note", "Form 1", "Nowhere"]$q$::jsonb, $q$Type the real numbers in Form 2.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=7;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$Why is the trust objection a 'gift'?$q$, $q$["It lets you deliver the guarantee — our strongest point", "It ends the call", "It means they'll buy", "It's not an objection"]$q$::jsonb, $q$Deliver the offer.$q$),
($q$What do you guarantee?$q$, $q$["We make their investment back in 90 days or keep working until we do", "20 new clients", "Higher AUM", "Investment returns"]$q$::jsonb, $q$Never add numbers.$q$),
($q$'Can you guarantee me 20 clients?' You say…$q$, $q$["No number — give the guarantee as written", "\"Yes, easily.\"", "\"Probably.\"", "\"We'll see.\""]$q$::jsonb, $q$Only the structure is guaranteed.$q$),
($q$Best way to show it works?$q$, $q$["Their own numbers and a walkthrough of the system", "Saying 'we're different'", "Made-up case studies", "Pressure"]$q$::jsonb, $q$Show, don't claim.$q$),
($q$Which is never allowed?$q$, $q$["Promising investment returns", "Explaining the guarantee", "Showing the app", "Using their numbers"]$q$::jsonb, $q$Regulated firms — no return promises.$q$),
($q$Funnel line for 'Everyone says that'?$q$, $q$["\"You're not sure we can make this happen — I'm glad you said that.\"", "\"We're not like everyone.\"", "\"Trust me.\"", "\"Fine.\""]$q$::jsonb, $q$Welcome it.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=8;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$First move when they 'already have someone'?$q$, $q$["Ask how it's going and what results they see", "Bad-mouth the other company", "Hang up", "Drop the price"]$q$::jsonb, $q$Find the gap.$q$),
($q$The gap question is…$q$, $q$["\"What's it not doing that you wish it were?\"", "\"Why did you pick them?\"", "\"How much do they charge?\"", "\"Can I replace them?\""]$q$::jsonb, $q$If they name it, they own it.$q$),
($q$How do you position NewLight next to their provider?$q$, $q$["We add the part that turns attention into booked and won clients", "We replace everyone", "We're cheaper", "We're the same"]$q$::jsonb, $q$Next to it, not against it.$q$),
($q$'We tried an agency — wasted money.' You first…$q$, $q$["Ask what they tried and what happened", "Say 'we're different'", "Offer a refund", "Argue"]$q$::jsonb, $q$Diagnose before you defend.$q$),
($q$Which is never allowed?$q$, $q$["Bad-mouthing their current provider", "Asking how it's going", "Finding the gap", "Mentioning the guarantee"]$q$::jsonb, $q$Stay professional.$q$),
($q$Why does the guarantee help with 'burned before'?$q$, $q$["We only get paid ongoing after we've made their investment back", "It's free", "It promises clients", "It doesn't help"]$q$::jsonb, $q$Lower risk than what burned them.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=9;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$How should you treat 'compliance has to approve it'?$q$, $q$["As normal — find their review process", "As a final no", "As a lie", "As something to ignore"]$q$::jsonb, $q$Most firms have a review.$q$),
($q$What can you truthfully say?$q$, $q$["\"Nothing goes out without your approval, so compliance sees it first.\"", "\"Compliance won't be a problem.\"", "\"We're FINRA approved.\"", "\"You don't need compliance.\""]$q$::jsonb, $q$Never claim approvals we don't have.$q$),
($q$A BD-tied advisor says revenue share isn't allowed. Offer…$q$, $q$["The flat $7,000/month option", "A bigger revenue share", "Nothing", "A free trial"]$q$::jsonb, $q$Fixed fee instead.$q$),
($q$Which is never allowed?$q$, $q$["Giving legal or regulatory advice", "Asking who handles compliance", "Inviting compliance to a meeting", "Noting it on the lead"]$q$::jsonb, $q$We're not their lawyers.$q$),
($q$What do you ask to keep the deal moving?$q$, $q$["\"Who handles that review and how long does it take?\"", "\"Can you skip it?\"", "\"Why so strict?\"", "\"Is your boss around?\""]$q$::jsonb, $q$Find the process.$q$),
($q$Where do you note the compliance process?$q$, $q$["On the lead in the app", "Nowhere", "In a text to a friend", "On their website"]$q$::jsonb, $q$Log everything.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=10;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$What does 'send me some info' usually mean?$q$, $q$["A polite way to end the call", "A strong buying signal", "A request for a contract", "They'll read it carefully"]$q$::jsonb, $q$Info alone gets deleted.$q$),
($q$Best response?$q$, $q$["\"Happy to — what would you want it to answer?\"", "\"Sure, bye.\"", "\"We don't do brochures.\"", "\"Look us up.\""]$q$::jsonb, $q$Their answer is the real objection.$q$),
($q$After agreeing to send info, you…$q$, $q$["Book 15 minutes to go over it together", "Wait for them to call", "Send ten emails", "Call every day"]$q$::jsonb, $q$Info plus a meeting.$q$),
($q$'We'll reach out if we're interested.' You…$q$, $q$["Ask to put a short check-in on the calendar", "Wait for them", "Argue", "Hang up"]$q$::jsonb, $q$So it doesn't fall through the cracks.$q$),
($q$Which should you never do?$q$, $q$["Leave without a date for the next touch", "Ask what the info should answer", "Book a review", "Send something specific"]$q$::jsonb, $q$Always a next date.$q$),
($q$Funnel line for 'Just email me'?$q$, $q$["\"Happy to — I'll send something over.\"", "\"No.\"", "\"Why?\"", "\"Email is dead.\""]$q$::jsonb, $q$Agree, then make it specific.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=11;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$How do you ask for the owner?$q$, $q$["Calmly by name: \"Hi, is [name] available?\"", "Pretend you're a friend", "Pitch the receptionist", "Ask for 'whoever'"]$q$::jsonb, $q$Calm and direct.$q$),
($q$When they ask who's calling, you give…$q$, $q$["Your real name", "A fake name", "No answer", "The owner's name"]$q$::jsonb, $q$Always honest.$q$),
($q$Which is never allowed?$q$, $q$["Making up a referral or a person who sent you", "Asking when to call back", "Asking their name", "Giving a short true reason"]$q$::jsonb, $q$No pretexts.$q$),
($q$When the owner is busy, you…$q$, $q$["Ask the best time to call back and the gatekeeper's name", "Hang up", "Insist", "Leave a long voicemail with the gatekeeper"]$q$::jsonb, $q$Create continuity.$q$),
($q$What outcome do you log?$q$, $q$["Gatekeeper, with a callback", "Booked", "Not interested", "Nothing"]$q$::jsonb, $q$Log everything.$q$),
($q$A short, true reason for the call is…$q$, $q$["\"It's about how people in [city] find firms like yours online.\"", "\"I'm returning his call.\"", "\"It's personal.\"", "\"His friend told me to call.\""]$q$::jsonb, $q$True and specific.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=12;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$They raise three objections at once. You…$q$, $q$["Ask which one is biggest and solve that first", "Answer all three quickly", "Give up", "Drop the price"]$q$::jsonb, $q$Usually one real one.$q$),
($q$After solving the main one, you ask…$q$, $q$["\"Does that help with the others?\"", "\"Anything else? Anything? Anything?\"", "\"Ready to sign?\"", "Nothing"]$q$::jsonb, $q$The rest often disappear.$q$),
($q$When should you qualify out?$q$, $q$["Same objection twice with nothing new and no path forward", "After the first no", "Never", "When they ask a question"]$q$::jsonb, $q$A fast no beats a long maybe.$q$),
($q$How do you qualify out?$q$, $q$["Cleanly — ask when's a better time of year", "Rudely", "By ghosting", "By arguing"]$q$::jsonb, $q$Leave the door open.$q$),
($q$Why is a fast no valuable?$q$, $q$["It frees your time for firms that want it", "It hurts your stats", "It's not", "It means they'll buy later"]$q$::jsonb, $q$Time is your inventory.$q$),
($q$What do you do after letting go?$q$, $q$["Log the right outcome in the app", "Nothing", "Call back daily", "Delete the lead"]$q$::jsonb, $q$The pool handles rest and recycle.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=13;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$What's the goal of drilling the deck?$q$, $q$["Recognize the core objection under any wording", "Memorize exact lines only", "Fill time", "Impress your team leader"]$q$::jsonb, $q$Recognition beats memorization.$q$),
($q$When should you drill the deck?$q$, $q$["Before every calling block", "Once a year", "Only after a bad day", "Never"]$q$::jsonb, $q$Short and often.$q$),
($q$Before flipping a card, you…$q$, $q$["Say your funnel line out loud", "Flip it immediately", "Skip it", "Read the back first"]$q$::jsonb, $q$Practice out loud.$q$),
($q$'Our broker-dealer controls our marketing' belongs to…$q$, $q$["Compliance", "Too expensive", "Need to think", "Send me info"]$q$::jsonb, $q$Financial-firm specific.$q$),
($q$'Can you guarantee results?' belongs to…$q$, $q$["Don't trust it'll work", "Not interested", "Already covered", "Need to talk to someone"]$q$::jsonb, $q$Deliver the guarantee.$q$),
($q$'Do you have a website?' as a brush-off belongs to…$q$, $q$["Send me info", "Compliance", "Too expensive", "Don't see the value"]$q$::jsonb, $q$Make it specific, book the review.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=14;