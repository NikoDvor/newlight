delete from nl_training_questions where module_id='54a8980b-c59f-4123-a84f-4bed6cdc904c';
delete from nl_training_chapters where module_id='54a8980b-c59f-4123-a84f-4bed6cdc904c';
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('54a8980b-c59f-4123-a84f-4bed6cdc904c', 1, $c$The closing mindset$c$, $c$Closing is a posture, not a moment.$c$, $c$# The closing mindset

Closing isn't a moment at the end. It's a posture you hold from the first second. The ask is just where the conversation was always going.

---

## Bad closers
- Ask permission: *"Would you be interested in setting up a time?"*
- Soften it: *"If it makes sense, maybe we could…"*
- Talk after the ask: *"Or we could revisit later if now's not good."*
- Close too late — they keep pitching past the yes.

## Elite closers
- Assume the outcome. Only logistics are open: *"Mornings or afternoons?"*
- Close early when a signal shows up.
- Go silent after the ask.

---

## The four separators
1. **They don't need the yes.** Desperation is audible. Want it, don't need it.
2. **They close early and often** — small trial closes all the way through.
3. **They protect the silence.** The person who fills it talks themselves out of it.
4. **Their language assumes.** *"When we set this up…"* not *"If you decide…"*

---

## Tone of the close
Flat or down at the end. Calm, certain, like you're telling them the next step.

!! Before every ask: Am I stating the next step? Is my tone going down? Am I ready to be silent? Do I believe this is right for them?$c$, 'all', 4) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '54a8980b-c59f-4123-a84f-4bed6cdc904c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$Closing is best described as…$q$, $q$["A posture you hold from the first second", "One moment at the end", "Reading the price", "A trick"]$q$::jsonb, $q$The ask is the natural end of the conversation.$q$),
($q$Which is a bad-closer habit?$q$, $q$["Softening the ask: \"If it makes sense, maybe…\"", "Going silent after the ask", "Asking 'mornings or afternoons?'", "Closing when a signal appears"]$q$::jsonb, $q$Softening signals doubt.$q$),
($q$Why shouldn't you 'need' the yes?$q$, $q$["Desperation is audible and kills trust", "You don't care about results", "It's against the rules", "It makes calls longer"]$q$::jsonb, $q$Want it, don't need it.$q$),
($q$What tone should the close have?$q$, $q$["Flat or down at the end — calm and certain", "Rising like a question", "Loud and excited", "Whispered"]$q$::jsonb, $q$Tell them the next step.$q$),
($q$What do elite closers do after the ask?$q$, $q$["Stay silent", "Add more benefits", "Offer a discount", "Change the subject"]$q$::jsonb, $q$Protect the silence.$q$),
($q$Which is assumptive language?$q$, $q$["\"When we set this up for you…\"", "\"If you decide to go ahead…\"", "\"Maybe someday…\"", "\"Is there any chance…\""]$q$::jsonb, $q$Frame it as decided.$q$)) as v(t, o, e);
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('54a8980b-c59f-4123-a84f-4bed6cdc904c', 2, $c$The option close$c$, $c$Two yeses instead of yes or no.$c$, $c$# The option close

*"Do you want to meet?"* → they choose yes or no. Under doubt, no is easy.

*"Mornings or afternoons?"* → they choose a time. The decision to meet is already made.

---

## Versions
- **Time of day:** "Mornings or afternoons better this week?"
- **Day:** "Earlier in the week or later?"
- **Two real slots:** "I've got Tuesday at 10 or Thursday at 2 — which works?"
- **SDR — the plan:** "Would you rather go with the revenue share or the flat monthly?"

[[visual:option-close]]

---

## Deliver it right
One sentence. Flat tone. Then silence.

~~"So… if you were maybe interested… we could do a morning or afternoon if that works?"~~

> "Let me grab a time — mornings or afternoons better for you this week?"

## After they pick
Lock it immediately: send your **Form 1 link** while you're on the phone and confirm it landed.

!! Two options only. Three or more brings back the indecision.$c$, 'all', 3) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '54a8980b-c59f-4123-a84f-4bed6cdc904c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$Why does the option close work?$q$, $q$["It replaces yes/no with a choice between two yeses", "It confuses them", "It's faster to say", "It avoids the meeting"]$q$::jsonb, $q$The decision is already made.$q$),
($q$How many options should you give?$q$, $q$["Two", "One", "Three or more", "As many as possible"]$q$::jsonb, $q$More brings back indecision.$q$),
($q$Best option close on a call?$q$, $q$["\"I've got Tuesday at 10 or Thursday at 2 — which works?\"", "\"Do you want to meet?\"", "\"Whenever works, let me know.\"", "\"Maybe next month?\""]$q$::jsonb, $q$Specific slots decide faster.$q$),
($q$SDR option close on the plan?$q$, $q$["\"Revenue share or the flat monthly?\"", "\"Do you want to buy?\"", "\"Think it over?\"", "\"Should I lower the price?\""]$q$::jsonb, $q$Both answers move forward.$q$),
($q$Right after they pick a time, you…$q$, $q$["Send your Form 1 link on the call and confirm it landed", "Celebrate", "Say you'll email later", "Re-explain the meeting"]$q$::jsonb, $q$It's only real once it's booked.$q$),
($q$What tone should the option close have?$q$, $q$["Flat, then silence", "Rising, then more talking", "Rushed", "Apologetic"]$q$::jsonb, $q$One sentence, then stop.$q$)) as v(t, o, e);
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('54a8980b-c59f-4123-a84f-4bed6cdc904c', 3, $c$The assignment close$c$, $c$Give them a small task that makes the booking happen.$c$, $c$# The assignment close

Instead of asking for a commitment, give them a small task **right now**. The task is the close.

> "While I have you — pull up your calendar and let's lock something in before we hang up."

Once the calendar is open, the booking happens. Actions are easier than decisions.

---

## The sequence
1. Positive signal or trial-close yes.
2. *"Pull up your calendar right now."*
3. They open it.
4. Name two times.
5. They pick one.
6. **Send the link while you're still on the call.**
7. Confirm it landed: *"Got it? You'll get a reminder before we meet."*

!! The booking isn't real until step 6. Most people stop at step 4 — and wonder why meetings don't show.

---

## On Zoom (SDR)
After a won discovery:
> "Let's get the closing meeting on the calendar now while we're both here."

Fill **Form 2** and book it before you leave the Zoom.$c$, 'all', 3) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '54a8980b-c59f-4123-a84f-4bed6cdc904c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$What is the assignment close?$q$, $q$["Giving them a small task right now that makes the booking happen", "Asking them to think about it", "Sending homework by email", "Asking for payment"]$q$::jsonb, $q$The task is the close.$q$),
($q$Key phrase on a cold call?$q$, $q$["\"While I have you — pull up your calendar.\"", "\"Think about your schedule and let me know.\"", "\"I'll call back later.\"", "\"Are you free sometime?\""]$q$::jsonb, $q$Immediacy without pressure.$q$),
($q$When is the booking real?$q$, $q$["Once you've sent the link and they've confirmed it", "When they say 'sure'", "When you hang up", "When you log the call"]$q$::jsonb, $q$Step 6 makes it real.$q$),
($q$Why does it work?$q$, $q$["Actions are easier than decisions", "It tricks them", "It's shorter", "It avoids objections"]$q$::jsonb, $q$People finish tasks they've started.$q$),
($q$After a won discovery on Zoom, you…$q$, $q$["Fill Form 2 and book the closing meeting before leaving", "Email them next week", "Wait for them to reach out", "Send Pay & Sign immediately"]$q$::jsonb, $q$Lock the next step.$q$),
($q$Where do most people stop too early?$q$, $q$["After they pick a time, without sending the link", "Before the trial close", "At the opener", "After sending the link"]$q$::jsonb, $q$That's why meetings don't show.$q$)) as v(t, o, e);
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('54a8980b-c59f-4123-a84f-4bed6cdc904c', 4, $c$The proof close$c$, $c$Real proof only — never invented.$c$, $c$# The proof close

People don't want to be first. Showing that the system works — honestly — gives them permission to say yes.

---

## Use only what's true
- **Real results** from real clients, with permission. Specific beats vague.
- **The system itself.** Show them the pipeline, the meeting outcomes, how leaks get found. Seeing it is proof.
- **The guarantee.** If you don't have a story that fits, the guarantee **is** your proof: we make the investment back first, or keep working until we do.

!! Never invent a client, a result, a number or a firm "down the street." With financial firms, one fake claim ends the deal and can end your job.

---

## How it sounds
> "Here's exactly how it works for you: [show the pipeline]. And you're covered — we make your investment back in 90 days, or keep working until we do. Mornings or afternoons for the next step?"

## When to use it
- They're interested but frozen.
- "I need to think about it" with no clear reason.
- Right before an option close.

Not as an opener — proof lands **after** value.$c$, 'all', 3) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '54a8980b-c59f-4123-a84f-4bed6cdc904c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$What can you use as proof?$q$, $q$["Real results, the system itself, and the guarantee", "Made-up client stories", "Invented numbers", "Other companies' results"]$q$::jsonb, $q$Only what's true.$q$),
($q$You don't have a client story that fits. What's your proof?$q$, $q$["The guarantee and a walkthrough of the system", "Make one up", "Skip the close", "Say 'trust me'"]$q$::jsonb, $q$The guarantee is proof.$q$),
($q$Why is inventing proof especially dangerous here?$q$, $q$["Financial firms are regulated — one fake claim ends the deal", "It takes too long", "It's boring", "It's not dangerous"]$q$::jsonb, $q$Never invent.$q$),
($q$When should you use the proof close?$q$, $q$["After value, when they're interested but frozen", "As your opener", "Before rapport", "Never"]$q$::jsonb, $q$Proof lands after value.$q$),
($q$What should follow the proof close?$q$, $q$["An option close", "Silence forever", "A brochure", "Hanging up"]$q$::jsonb, $q$Feed it into the ask.$q$),
($q$Which proof line is allowed?$q$, $q$["\"We make your investment back in 90 days, or keep working until we do.\"", "\"Every firm in your city uses us.\"", "\"We guarantee 30 new clients.\"", "\"Your competitor just signed.\" (untrue)"]$q$::jsonb, $q$The guarantee as written.$q$)) as v(t, o, e);
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('54a8980b-c59f-4123-a84f-4bed6cdc904c', 5, $c$Reading the room$c$, $c$Close when they're ready, not when your script ends.$c$, $c$# Reading the room

The biggest mistake isn't closing too early. It's closing too late — after their excitement peaks and fades.

---

## Six signals
1. **They ask about price or setup** unprompted.
2. **They ask "how does it work?"** — they're picturing themselves in it.
3. **They repeat your points back** — they're selling themselves.
4. **They go quiet after the pitch** — that's processing, not rejection.
5. **On the phone:** tone warms, pace slows, questions replace deflections.
6. **On Zoom:** they lean in, take notes, stop looking at the other screen.

---

## The rule
Signal → stop pitching → close. Every extra word gives them time to talk themselves out of it.

## The silence rule
After the ask: nothing. Practice holding 10 seconds of silence in role-play until it's easy.

[[visual:silence]]$c$, 'all', 3) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '54a8980b-c59f-4123-a84f-4bed6cdc904c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$What's the more common closing mistake?$q$, $q$["Closing too late", "Closing too early", "Smiling", "Asking questions"]$q$::jsonb, $q$Excitement peaks and fades.$q$),
($q$They ask 'how does it work?' That means…$q$, $q$["They're picturing themselves in it — close", "They're confused — pitch more", "They want to leave", "Nothing"]$q$::jsonb, $q$Stop pitching, start closing.$q$),
($q$They go quiet after your pitch. It usually means…$q$, $q$["They're processing — hold the silence", "They hate it", "The call dropped", "Pitch again"]$q$::jsonb, $q$Silence isn't rejection.$q$),
($q$Which Zoom cue is a signal?$q$, $q$["They take notes and lean in", "They turn off their camera", "They check their phone", "They mute"]$q$::jsonb, $q$Engagement = interest.$q$),
($q$After the ask, how long should you be able to hold silence?$q$, $q$["As long as it takes — practice 10 seconds", "One second", "Never pause", "Until you add a benefit"]$q$::jsonb, $q$Practice until it's easy.$q$),
($q$Signal appears mid-pitch. You…$q$, $q$["Stop and close right there", "Finish the script first", "Add one more feature", "Summarize everything"]$q$::jsonb, $q$Every extra word is risk.$q$)) as v(t, o, e);
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('54a8980b-c59f-4123-a84f-4bed6cdc904c', 6, $c$The stall after the close$c$, $c$'Let me think about it' — recover the momentum.$c$, $c$# The stall after the close

"Let me think about it" **after** the ask isn't a no. It's an unresolved concern. Don't back off. Don't re-pitch. Find it.

---

## Common stalls
- **"Let me think about it."** Something's unresolved.
- **"Send me some information."** An exit without conflict.
- **"Call me next week."** Hoping it goes away.
- **"I need to talk to my partner."** Might be real — set the three-way meeting right now.

---

## RAC at the close
- **Recognize:** *"Totally fair — this is a real decision."*
- **Ask:** *"What part would you want to think through?"*
- **Close forward** once it's solved.

## The direct question
> "Most people who say that never move forward — and I don't want that for you. What would need to be true for you to feel good about this today?"

---

## Always lock the next step
> "Let's lock in a time to reconnect — Tuesday or Wednesday?"

Book it in the app before you hang up. Never leave it open.$c$, 'all', 3) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '54a8980b-c59f-4123-a84f-4bed6cdc904c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$What is a stall after the close?$q$, $q$["An unresolved concern", "A final no", "A yes", "A scheduling problem"]$q$::jsonb, $q$Find it.$q$),
($q$First move with 'Let me think about it' after the ask?$q$, $q$["Recognize it, then ask what they'd think through", "Agree and hang up", "Re-pitch everything", "Drop the price"]$q$::jsonb, $q$RAC.$q$),
($q$'I need to talk to my partner' — and it's real. You…$q$, $q$["Set the meeting with both of them right now", "Wait for them to call", "Send a brochure", "Give up"]$q$::jsonb, $q$Lock the three-way.$q$),
($q$What's the direct question?$q$, $q$["\"What would need to be true for you to feel good about this today?\"", "\"Why are you stalling?\"", "\"Are you serious?\"", "\"Can I call next year?\""]$q$::jsonb, $q$Surface the real concern.$q$),
($q$Before hanging up on a stall, you always…$q$, $q$["Lock a specific next date and book it in the app", "Say 'talk soon'", "Send a long email", "Delete the lead"]$q$::jsonb, $q$Never open-ended.$q$),
($q$'Call me next week' usually means…$q$, $q$["They hope it goes away", "They'll definitely call", "They want a discount", "They're ready"]$q$::jsonb, $q$Pin it down now.$q$)) as v(t, o, e);
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('54a8980b-c59f-4123-a84f-4bed6cdc904c', 7, $c$Every close in the arsenal$c$, $c$The lines, ready to use.$c$, $c$# Every close

## Option close
> "Would you rather go with the revenue share, or the flat monthly?"

## Question close
> "Would you be opposed to getting started?"

## Assumptive close
> "Based on everything we went over — your goal of [goal], the [gap] you're short at your current pace — it doesn't make sense to keep doing it the same way. Let's get you started. Mornings or afternoons for the kickoff?"

## Summary close
> "So to recap — you want [goal], you're at [now], and right now there's no system closing that gap. Does it make sense to start solving that today, or keep it the way it is?"

## Takeaway close
> "Honestly, if this isn't a priority right now, I don't want to push you into it. Is it a priority, or a 'someday' thing?"

## Vision close
> "Picture a year from now — calendar full of the right clients, without chasing referrals. Is that worth starting today?"

## Guarantee close
> "You're covered either way — we make your investment back in 90 days, or keep working until we do. Shall we get started?"

!! Never use a scarcity close ("only two spots left") unless it's literally true.$c$, 'all', 3) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '54a8980b-c59f-4123-a84f-4bed6cdc904c', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$Which is an option close for the plan?$q$, $q$["\"Revenue share, or the flat monthly?\"", "\"Do you want it?\"", "\"Think it over?\"", "\"Is it too much?\""]$q$::jsonb, $q$Two yeses.$q$),
($q$A summary close uses…$q$, $q$["Their goal, where they are now, and the gap", "Our company history", "A discount", "A deadline"]$q$::jsonb, $q$Their own numbers.$q$),
($q$When can you use a scarcity close?$q$, $q$["Only when it's literally true", "Always", "When they hesitate", "Never mention it either way"]$q$::jsonb, $q$Truth only.$q$),
($q$The takeaway close works because…$q$, $q$["It removes pressure and makes them claim it's a priority", "It insults them", "It ends the call", "It lowers the price"]$q$::jsonb, $q$People want what's pulled back.$q$),
($q$Which close leans on our strongest point?$q$, $q$["The guarantee close", "The scarcity close", "The bandwagon of fake clients", "The discount close"]$q$::jsonb, $q$We make it back first.$q$),
($q$The vision close asks them to…$q$, $q$["Picture life a year from now with the problem solved", "Read a contract", "Call a reference", "Pick a payment date"]$q$::jsonb, $q$Let them see it.$q$)) as v(t, o, e);
update nl_training_modules set module_description=$c$Every close you need — for booking the first meeting on the phone and winning the client on Zoom.$c$, tagline=$c$Get the yes$c$ where id='54a8980b-c59f-4123-a84f-4bed6cdc904c';