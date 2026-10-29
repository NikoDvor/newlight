delete from nl_training_questions where module_id='49e85e03-72b0-4297-95ec-03d60f7db51c';
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$What do you do before handling any objection?$q$, $q$["Isolate it", "Drop the price", "Re-pitch", "End the call"]$q$::jsonb, $q$Isolate first to set up the close.$q$),
($q$Which line isolates the objection?$q$, $q$["\"If we solved this, there'd be no other reason not to move along, correct?\"", "\"Are you sure?\"", "\"Let me explain again.\"", "\"Can I call back?\""]$q$::jsonb, $q$Make sure it's the only thing in the way.$q$),
($q$In the 1–10 scale, what does 10 mean?$q$, $q$["They want to move forward today", "They want you gone", "They need more info", "They're neutral"]$q$::jsonb, $q$1 = beat me up, 10 = move forward today.$q$),
($q$They say 3. What do you ask?$q$, $q$["\"What would it take to get you from a 3 to a 10?\"", "\"Why so low?\"", "\"Want a discount?\"", "\"Okay, bye.\""]$q$::jsonb, $q$Find the gap.$q$),
($q$What happens if you skip isolating?$q$, $q$["You argue with a moving target", "You close faster", "Nothing", "They buy anyway"]$q$::jsonb, $q$Do it every single time.$q$),
($q$Once isolated and handled, you're set up to…$q$, $q$["Close and onboard them", "Start discovery over", "Send a brochure", "Lower the price"]$q$::jsonb, $q$Isolation sets up the close.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=1;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$Why learn the different ways an objection is said?$q$, $q$["Prospects rarely say it the way it's written", "To confuse them", "To skip objections", "It isn't useful"]$q$::jsonb, $q$Same objection, many wordings.$q$),
($q$They say "We're all set." Which objection is it?$q$, $q$["Not interested", "Too expensive", "Need to think", "Trust"]$q$::jsonb, $q$Funnel it into Not Interested.$q$),
($q$They say "I don't see the value." One way to funnel it?$q$, $q$["\"Okay, I hear you — you aren't interested.\"", "\"You're wrong.\"", "\"Let me list our services.\"", "\"Bye.\""]$q$::jsonb, $q$Say it back as the objection you know.$q$),
($q$What's step 2 of the funnel?$q$, $q$["Say it back as the objection you know", "Hang up", "Drop the price", "Send an email"]$q$::jsonb, $q$Hear it → say it back → run the play.$q$),
($q$How do you pick which objection it is?$q$, $q$["By what they mean, not their exact words", "By the first word", "Always 'not interested'", "Ask them"]$q$::jsonb, $q$Meaning over wording.$q$),
($q$Why does funneling help you?$q$, $q$["You only master a handful of plays", "It avoids talking", "It ends calls faster", "It replaces discovery"]$q$::jsonb, $q$Move onto ground you've practiced.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=2;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$Which is another way you'll hear 'I don't see the value'?$q$, $q$["\"What would this even do for us?\"", "\"Call me next week.\"", "\"Talk to my partner.\"", "\"What's the price?\""]$q$::jsonb, $q$Same objection, different words.$q$),
($q$SDR close starts with…$q$, $q$["\"I understand you don't see the value — can I ask a question?\"", "\"You're wrong.\"", "\"Let me lower the price.\"", "\"Okay, bye.\""]$q$::jsonb, $q$Acknowledge, then ask.$q$),
($q$SDR follow-up question?$q$, $q$["\"Do you not see the value in the modern marketing, or the AI?\"", "\"Why are you difficult?\"", "\"Want a brochure?\"", "\"Who's your boss?\""]$q$::jsonb, $q$Narrow down what they mean.$q$),
($q$SDR digs underneath with…$q$, $q$["\"So what's really beneath this all?\"", "\"Sign today.\"", "\"Fine.\"", "\"Next question.\""]$q$::jsonb, $q$Find the real concern.$q$),
($q$BDR pattern interrupt for this objection?$q$, $q$["\"I understand, you aren't interested.\"", "\"You'll regret this.\"", "\"Everyone loves us.\"", "\"Hold on.\""]$q$::jsonb, $q$Funnel into Not Interested.$q$),
($q$BDR quick version asks…$q$, $q$["What exactly they're not interested in, so you're prepared", "For a referral", "For their budget", "Nothing"]$q$::jsonb, $q$Be proactive for the next call.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=3;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$Which is another way you'll hear 'not interested'?$q$, $q$["\"We're all set.\"", "\"That's too expensive.\"", "\"My partner decides.\"", "\"Send me info.\""]$q$::jsonb, $q$Same objection.$q$),
($q$Pattern interrupt line?$q$, $q$["\"I hear you when you say you aren't interested. But can I make a suggestion?\"", "\"Why not?\"", "\"You should be.\"", "\"Bye.\""]$q$::jsonb, $q$Acknowledge, then ask permission.$q$),
($q$Resolve question?$q$, $q$["\"Is it more about the timing, the pricing, or something we went over?\"", "\"Do you hate marketing?\"", "\"Are you the owner?\"", "\"Can I email you?\""]$q$::jsonb, $q$Three choices reveal the real issue.$q$),
($q$After they name the issue, you ask…$q$, $q$["\"What about [issue] concerns you the most?\"", "\"Okay, goodbye.\"", "\"Want a discount?\"", "\"Are you sure?\""]$q$::jsonb, $q$Back into conversation.$q$),
($q$The BDR quick version says you didn't expect them to be interested within…$q$, $q$["The first 20–30 seconds", "A year", "One meeting", "A week"]$q$::jsonb, $q$Takes the pressure off.$q$),
($q$What's the bonus line?$q$, $q$["\"Would you be opposed to filling up your calendar next month?\"", "\"Can I have your email?\"", "\"Who else should I call?\"", "\"Are you busy?\""]$q$::jsonb, $q$Set the marketing aside, talk outcome.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=4;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$Which is another way you'll hear 'too expensive'?$q$, $q$["\"It's not in the budget.\"", "\"We're all set.\"", "\"I need to think.\"", "\"Who are you?\""]$q$::jsonb, $q$Same objection.$q$),
($q$What's the framework order?$q$, $q$["Pattern interrupt → Resolve → Add value → Close", "Close → Pitch → Discount", "Discount → Close", "Pitch → Pitch → Pitch"]$q$::jsonb, $q$Tonality, pacing, value, close.$q$),
($q$Pattern interrupt line?$q$, $q$["\"I know it's out of your budget right now. But can I make a suggestion?\"", "\"It's cheap.\"", "\"Everyone pays it.\"", "\"Fine, bye.\""]$q$::jsonb, $q$Acknowledge, then suggest.$q$),
($q$The resolve compares…$q$, $q$["Missed revenue opportunity vs. what they're spending now", "Us vs. competitors", "Last year vs. this year", "Nothing"]$q$::jsonb, $q$Which is more expensive?$q$),
($q$The alternate/BDR version asks…$q$, $q$["\"Setting money aside — if the results were guaranteed, is this something you'd want?\"", "\"Can you borrow money?\"", "\"Why so cheap?\"", "\"Want a free trial?\""]$q$::jsonb, $q$Separate desire from budget.$q$),
($q$If they say no to wanting it even with money aside, you…$q$, $q$["Return to discovery", "Close harder", "Drop the price", "Hang up"]$q$::jsonb, $q$They don't want the outcome yet.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=5;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$Which is another way you'll hear the trust objection?$q$, $q$["\"Sounds too good to be true.\"", "\"Call me next week.\"", "\"We're all set.\"", "\"Too expensive.\""]$q$::jsonb, $q$Same objection.$q$),
($q$How should you feel about this objection?$q$, $q$["Glad — it lets you deliver the strongest thing we sell", "Defensive", "Annoyed", "Ready to hang up"]$q$::jsonb, $q$It's a gift.$q$),
($q$What do you say right after acknowledging it?$q$, $q$["\"This is actually the backbone of how our company separates from our competitors.\"", "\"Trust me.\"", "\"Everyone trusts us.\"", "\"Fine.\""]$q$::jsonb, $q$Then explain the offer.$q$),
($q$Our core offer…$q$, $q$["Eliminates the risk", "Is the cheapest", "Has no setup", "Guarantees AUM"]$q$::jsonb, $q$ROI-based.$q$),
($q$When does the retainer start?$q$, $q$["Once the pipeline has made back their investment", "Day 1", "After a week", "Never"]$q$::jsonb, $q$We make it back first.$q$),
($q$If we don't hit it by day 90…$q$, $q$["We work for free until we do", "They get a refund", "We stop", "The price doubles"]$q$::jsonb, $q$That's the guarantee.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=6;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$An objection is…$q$, $q$["A signal, not a rejection", "A final no", "A personal attack", "A reason to quit"]$q$::jsonb, $q$Something specific is unresolved.$q$),
($q$The right mental model is…$q$, $q$["You and the prospect vs. the roadblock", "You vs. the prospect", "The prospect vs. the price", "No model"]$q$::jsonb, $q$Collaborate, don't defend.$q$),
($q$Which three objections share one root?$q$, $q$["Too expensive, need to think, don't see the value", "Gatekeeper, voicemail, email", "Partner, spouse, boss", "None"]$q$::jsonb, $q$They can't yet see the return justifies the cost.$q$),
($q$Your first move when they object?$q$, $q$["Acknowledge, then ask one question", "Counter-argue", "Drop the price", "Hang up"]$q$::jsonb, $q$Curiosity, not defense.$q$),
($q$What does RAC stand for?$q$, $q$["Recognize, Ask, Close forward", "Repeat, Argue, Concede", "Rebut, Answer, Call", "Relax, Agree, Close"]$q$::jsonb, $q$The core framework.$q$),
($q$When should you qualify out?$q$, $q$["Same objection twice, nothing back, no path forward", "After the first no", "Never", "When they ask a question"]$q$::jsonb, $q$A fast no beats a three-week maybe.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=7;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$How should you see the gatekeeper?$q$, $q$["As the first test of your professionalism", "As an enemy", "As someone to bulldoze", "As unimportant"]$q$::jsonb, $q$Respect wins.$q$),
($q$Default opener on the phone?$q$, $q$["\"Hey, is [owner name] available?\"", "Your full company pitch", "\"Can I talk to whoever?\"", "\"I'm from a marketing company…\""]$q$::jsonb, $q$Calm and direct.$q$),
($q$Wrong purpose statement?$q$, $q$["\"I'm from a marketing company and I wanted to talk about our services.\"", "\"I noticed something about your online presence I wanted to flag.\"", "\"It's about their online presence — a couple of minutes.\"", "\"I put something together for the business.\""]$q$::jsonb, $q$That's a sales call in 15 words.$q$),
($q$What's the ally frame?$q$, $q$["Asking the gatekeeper to help you find a good time", "Ignoring them", "Pressuring them", "Lying to them"]$q$::jsonb, $q$Make them a collaborator.$q$),
($q$When the owner is busy, you ask…$q$, $q$["When's the best time, and the gatekeeper's name", "To hold", "For the owner's cell", "Nothing"]$q$::jsonb, $q$Create continuity.$q$),
($q$A good voicemail is…$q$, $q$["Specific — you noticed something and you'll try again on a set day", "Generic and long", "A full pitch", "Silent"]$q$::jsonb, $q$Specific voicemails get returned.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=8;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$Which is another way you'll hear 'don't see the value'?$q$, $q$["\"We're doing fine.\"", "\"My partner decides.\"", "\"Call me next quarter.\"", "\"What's the price?\""]$q$::jsonb, $q$Same objection.$q$),
($q$Why does 'not interested' fire so fast?$q$, $q$["It's an autopilot reflex", "They researched us", "They hate sales", "It's a final decision"]$q$::jsonb, $q$Conditioned reflex.$q$),
($q$Both objections are really saying…$q$, $q$["You haven't made this real for me yet", "We hate you", "Too expensive", "Call back later"]$q$::jsonb, $q$Build the bridge.$q$),
($q$Temperature check: they say 7 or above. You…$q$, $q$["Close", "Pitch more", "Hang up", "Ask why"]$q$::jsonb, $q$They're ready.$q$),
($q$The funnel moves 'no value' to…$q$, $q$["\"I don't believe you can execute\" — solvable with proof", "A discount talk", "A referral", "Nothing"]$q$::jsonb, $q$"What about that would you regret?"$q$),
($q$The critical rule?$q$, $q$["Never re-pitch after an objection", "Always re-pitch", "Lower the price", "Talk faster"]$q$::jsonb, $q$Less pitch, more questions.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=9;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$Which is another way you'll hear 'need to think'?$q$, $q$["\"Call me next quarter.\"", "\"We're all set.\"", "\"Too expensive.\"", "\"Who is this?\""]$q$::jsonb, $q$Same objection.$q$),
($q$'I need to think about it' really means…$q$, $q$["Something specific is unresolved", "They'll think carefully", "Yes", "No forever"]$q$::jsonb, $q$Find what's underneath.$q$),
($q$Reframe line?$q$, $q$["\"Decisions don't take time — they take information.\"", "\"Take your time.\"", "\"Think fast.\"", "\"I'll call later.\""]$q$::jsonb, $q$Give them the information now.$q$),
($q$The three options are…$q$, $q$["Timing, investment, or something that doesn't feel right", "Yes, no, maybe", "Now, later, never", "Email, call, text"]$q$::jsonb, $q$People pick one.$q$),
($q$Best response to 'I need to talk to my partner'?$q$, $q$["Get everyone on a call together", "Let them pitch it alone", "Send a brochure", "Give up"]$q$::jsonb, $q$No broken telephone.$q$),
($q$The ally close asks…$q$, $q$["\"What would you do if they said no?\"", "\"Why ask them?\"", "\"Can you decide?\"", "\"Is your partner nice?\""]$q$::jsonb, $q$Find out who really decides.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=10;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$Which is another way you'll hear the pricing question?$q$, $q$["\"Ballpark?\"", "\"We're good.\"", "\"Talk to my partner.\"", "\"Send info.\""]$q$::jsonb, $q$Same objection.$q$),
($q$Price is usually a proxy for…$q$, $q$["Doubt", "Math", "Rudeness", "Nothing"]$q$::jsonb, $q$Raise perceived value.$q$),
($q$Best way to make the numbers land?$q$, $q$["Do the math with them using their numbers", "Recite our price list", "Talk faster", "Skip it"]$q$::jsonb, $q$People believe what they say.$q$),
($q$'What's your pricing?' asked early — you…$q$, $q$["Redirect to their goal and fit first", "Give the number and stop", "Refuse forever", "Hang up"]$q$::jsonb, $q$Value before cost.$q$),
($q$If they push for a price twice, you…$q$, $q$["Give a range tied to an outcome", "Refuse again", "Hang up", "Double it"]$q$::jsonb, $q$Then show what it looks like for them.$q$),
($q$'Your competitor is cheaper' — reframe?$q$, $q$["Cheaper only matters if you get the same result", "We're cheaper", "They're bad", "Fine, we'll match"]$q$::jsonb, $q$Shift what they're comparing.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=11;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$Which is another way you'll hear 'already have someone'?$q$, $q$["\"Our home office does our marketing.\"", "\"Too expensive.\"", "\"Call me later.\"", "\"Who is this?\""]$q$::jsonb, $q$Same objection.$q$),
($q$'We tried it before and it didn't work' is a…$q$, $q$["Trust deficit", "Budget problem", "Final no", "Timing issue"]$q$::jsonb, $q$They were burned.$q$),
($q$First move with a bad past experience?$q$, $q$["Diagnose: what did you try and what happened?", "Defend marketing", "Say we're different", "Drop the price"]$q$::jsonb, $q$Diagnose before you defend.$q$),
($q$Best gap question for 'already have someone'?$q$, $q$["\"What is your current setup not doing that you wish it were?\"", "\"Why them?\"", "\"Can I replace them?\"", "\"How much do you pay?\""]$q$::jsonb, $q$If they name it, they own it.$q$),
($q$How do you position against an in-house team?$q$, $q$["As a complement, not a replacement", "As better than them", "As cheaper", "Ignore them"]$q$::jsonb, $q$Make their team more effective.$q$),
($q$The rule for all three?$q$, $q$["Never say 'we're different' without specific proof", "Always say 'we're different'", "Lower price", "Agree and leave"]$q$::jsonb, $q$Specific proof beats generic claims.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=12;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$They throw three objections at once. You…$q$, $q$["Ask which is biggest and solve that first", "Answer all three", "Give up", "Discount"]$q$::jsonb, $q$Usually one real one.$q$),
($q$After solving the main one, you ask…$q$, $q$["\"Does that help with the others?\"", "\"Ready to sign?\"", "Nothing", "\"Any more?\" five times"]$q$::jsonb, $q$The rest often dissolve.$q$),
($q$After you resolve an objection, you…$q$, $q$["Move straight to the next step", "Pause and wait", "Ask how they feel", "Re-pitch"]$q$::jsonb, $q$The pause is where deals die.$q$),
($q$A pattern objection looks like…$q$, $q$["The same words no matter what you said", "A specific question about setup", "Specific language about a past result", "A buying signal"]$q$::jsonb, $q$Break the pattern first.$q$),
($q$Temperature 4–6 means…$q$, $q$["A genuine concern — ask what would move them up", "Close now", "Hang up", "Pattern objection"]$q$::jsonb, $q$Address that specifically.$q$),
($q$Signs it's time to qualify out?$q$, $q$["Same objection twice, no new info, every question deflected", "One no", "A price question", "Silence"]$q$::jsonb, $q$Leave clean.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=13;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$The goal of the master deck is…$q$, $q$["Internalizing root causes, not memorizing lines", "Memorizing every line", "Filling time", "Impressing others"]$q$::jsonb, $q$Handle objections you've never heard.$q$),
($q$'Not interested,' 'We're good,' 'No thanks' are which category?$q$, $q$["Autopilot", "Cost", "Access", "Proof demand"]$q$::jsonb, $q$Reflex before processing.$q$),
($q$'Need to think,' 'Call me back' are which category?$q$, $q$["Stall", "Wall", "Status quo", "Trust deficit"]$q$::jsonb, $q$A concern wearing a time mask.$q$),
($q$'Need to talk to my partner' is which category?$q$, $q$["Access", "Cost", "Autopilot", "Value gap"]$q$::jsonb, $q$Deflection to another person.$q$),
($q$'Already have someone' is which category?$q$, $q$["Status quo", "Proof demand", "Stall", "Wall"]$q$::jsonb, $q$Comfortable with the current state.$q$),
($q$How do you use the deck in role-play?$q$, $q$["Partner flips cards; you name the root cause and respond out loud", "Read silently", "Skip it", "Only after a bad day"]$q$::jsonb, $q$Practice out loud.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=14;
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '49e85e03-72b0-4297-95ec-03d60f7db51c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from nl_training_chapters c, (values
($q$Which is another way you'll hear 'we'll reach out'?$q$, $q$["\"Just send me an email.\"", "\"Too expensive.\"", "\"We tried it before.\"", "\"Who is this?\""]$q$::jsonb, $q$Same brush-off.$q$),
($q$What does 'we'll reach out' usually mean?$q$, $q$["A polite way to end the call", "They will definitely call", "A yes", "A price objection"]$q$::jsonb, $q$Make it specific.$q$),
($q$Best first response?$q$, $q$["\"Happy to — what would you want it to answer?\"", "\"Okay, bye.\"", "\"Why?\"", "\"We don't send info.\""]$q$::jsonb, $q$Their answer is the real objection.$q$),
($q$After agreeing to send info, you…$q$, $q$["Book 15 minutes to go over it together", "Wait for them", "Send ten emails", "Call daily"]$q$::jsonb, $q$Info plus a meeting.$q$),
($q$If they still say 'we'll reach out', you…$q$, $q$["Ask to put a quick check-in on the calendar", "Hang up", "Argue", "Give up"]$q$::jsonb, $q$So it doesn't fall through the cracks.$q$),
($q$What should you never do?$q$, $q$["Hang up without a date for the next touch", "Send info", "Ask a question", "Book a check-in"]$q$::jsonb, $q$Always a next date.$q$)) as v(t, o, e) where c.module_id='49e85e03-72b0-4297-95ec-03d60f7db51c' and c.chapter_number=15;