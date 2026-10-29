delete from nl_training_questions where module_id='3c2d03cb-d649-4528-ac3d-84cb930eeb12';
delete from nl_training_chapters where module_id='3c2d03cb-d649-4528-ac3d-84cb930eeb12';
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('3c2d03cb-d649-4528-ac3d-84cb930eeb12', 1, $c$What sales actually is$c$, $c$Finding a real problem and showing a solution that fits.$c$, $c$# What sales actually is

Sales isn't convincing people to do something they don't want. It's **finding a firm with a real problem, making the problem clear, and showing a solution that fits.**

Sales is the transfer of belief. If you don't believe it, they won't either.

---

## Every sale needs three things

1. **A real problem.** A gap between where the firm is and where it wants to be.
2. **They feel it.** Having a problem isn't enough — they have to see what it's costing them.
3. **They believe the fix works.** Missing any one = no sale.

For our firms: most growth comes from referrals and luck. They're invisible online, people searching for an advisor find someone else, and nobody tracks why booked meetings don't turn into clients.

---

## What you're really selling

Not SEO. Not ads. Not an app.

You're selling **more of the right clients, booked and won** — and the relief of not wondering where the next one comes from.

!! Sell the outcome. Let the features support it.

---

## The mindset

Every owner you call is already dealing with something — a flat year, a partner retiring, a competitor growing. You're not an interruption. You might be the answer to something already keeping them up.

?? What's the one sentence that should be in your head before every call? || "What problem am I solving for this firm — and what does their year look like once it's gone?"$c$, 'all', 3) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '3c2d03cb-d649-4528-ac3d-84cb930eeb12', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$Sales is best described as…$q$, $q$["Finding a real problem, making it clear, and showing a solution that fits", "Convincing people to buy what they don't need", "Reading a script word for word", "Giving the lowest price"]$q$::jsonb, $q$Sales is serving a real problem, not pushing.$q$),
($q$What are the three things every sale needs?$q$, $q$["A real problem, the prospect feeling it, and belief the fix works", "A discount, a deadline and a contract", "A website, ads and a CRM", "Rapport, small talk and a demo"]$q$::jsonb, $q$Miss any one and there's no sale.$q$),
($q$What does a NewLight salesman really sell?$q$, $q$["More of the right clients, booked and won", "SEO packages", "An app subscription", "Social media posts"]$q$::jsonb, $q$Sell the outcome; features support it.$q$),
($q$Why does conviction matter more than technique?$q$, $q$["Sales is the transfer of belief — if you don't believe it, they won't", "Technique doesn't matter at all", "Prospects only care about price", "Scripts handle belief for you"]$q$::jsonb, $q$Belief transfers; doubt does too.$q$),
($q$A typical financial firm we call gets most new clients from…$q$, $q$["Referrals and luck, with little online visibility", "Paid ads they track closely", "A full marketing team", "Cold walk-ins"]$q$::jsonb, $q$That gap is the problem we solve.$q$),
($q$How should you see yourself on a cold call?$q$, $q$["As a possible answer to something already worrying them", "As an interruption they should forgive", "As a vendor begging for time", "As someone reading a survey"]$q$::jsonb, $q$That frame changes your tone.$q$)) as v(t, o, e);
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('3c2d03cb-d649-4528-ac3d-84cb930eeb12', 2, $c$Tonality on the phone$c$, $c$How you say it decides how it lands.$c$, $c$# Tonality — the invisible closer

On the phone your voice is **all** they have. Two people can read the same line — one books, one gets hung up on.

---

## The 4 tones you need

- **Confident declaration** — calm, low, level. Statements end flat or down, never up. *Use for: your opener, your value, objections.*
- **Curious** — warmer, leaning in, genuinely interested. *Use for: discovery questions.*
- **Just between us** — a little quieter and slower. *Use for: the reveal — what you noticed about their firm.*
- **Matter-of-fact close** — no hesitation, like the next step is obvious. *Use for: booking the meeting.*

[[visual:tones]]

---

## The killer: pitch voice

Faster, higher, over-excited. Owners hear it in one second and their guard goes up.

!! Fix: slow down about 15%, drop your pitch a little, and talk like you're speaking to someone you respect.

---

## Daily drill

Record your opener every morning. Listen back. Fix **one** thing. In two weeks you'll sound like a different person.

?? Your voice goes up at the end of "Are mornings or afternoons better?" What does the owner hear? || Doubt — like you're not sure they want to meet. Say it flat or slightly down.$c$, 'all', 4) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '3c2d03cb-d649-4528-ac3d-84cb930eeb12', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$On a cold call, what does the prospect judge you on first?$q$, $q$["Your voice and tone", "Your job title", "Your email signature", "Your price"]$q$::jsonb, $q$On the phone your voice is all they have.$q$),
($q$Which tone fits your opener and handling objections?$q$, $q$["Confident declaration — calm, level, ending flat", "Excited and fast", "Questioning, ending high", "Whispering"]$q$::jsonb, $q$Statements should land like facts.$q$),
($q$Which tone fits discovery questions?$q$, $q$["Curious — warm and genuinely interested", "Matter-of-fact close", "Pitch voice", "Monotone reading"]$q$::jsonb, $q$Curiosity opens people up.$q$),
($q$What is 'pitch voice'?$q$, $q$["Faster, higher and over-excited — it puts guards up", "A calm low voice", "Pausing after a question", "Matching their pace"]$q$::jsonb, $q$Prospects hear it instantly.$q$),
($q$What's the fix for pitch voice?$q$, $q$["Slow down about 15% and drop your pitch a little", "Talk louder", "Speed up to keep attention", "Use more filler words"]$q$::jsonb, $q$Talk like you're speaking to someone you respect.$q$),
($q$Your voice rises at the end of your booking question. What does that signal?$q$, $q$["Doubt that they want to meet", "Confidence", "Friendliness that closes deals", "Nothing — tone doesn't matter"]$q$::jsonb, $q$Deliver the close flat or slightly down.$q$)) as v(t, o, e);
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('3c2d03cb-d649-4528-ac3d-84cb930eeb12', 3, $c$Pacing and mirroring$c$, $c$People trust people who feel like them.$c$, $c$# Pacing and mirroring

People relax around people who match their rhythm. It's not a trick — it's how trust works.

---

## Pacing
Match their speed and energy.
- Slow, careful advisor → slow down.
- Fast, direct owner → get to the point.
- Warm and chatty → connect first, then move.

!! The common mistake: one speed for everyone.

---

## Word mirroring
Use their words back.

*They:* "Honestly we're slammed this quarter."
*You:* "Totally get it — you're slammed. This takes 30 seconds."

Their brain hears its own language and feels understood.

---

## Pace, then lead
1. Match them first.
2. After about 30 seconds, slow your own pace a little.
3. Most people follow you down.
4. Now you're having a real conversation.

?? A rushed owner snaps "What is this?" How do you start? || Match the speed — short and direct — then slow down once they're listening.$c$, 'all', 3) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '3c2d03cb-d649-4528-ac3d-84cb930eeb12', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$What is pacing?$q$, $q$["Matching the speed and energy of the person you're talking to", "Talking as fast as possible", "Reading the script at one speed", "Pausing between every word"]$q$::jsonb, $q$Mismatch creates friction.$q$),
($q$A slow, careful advisor answers. What do you do?$q$, $q$["Slow down and match their thoughtful pace", "Speed up to create urgency", "Skip to the price", "Talk over them"]$q$::jsonb, $q$Match first.$q$),
($q$They say 'we're slammed right now.' Best mirror?$q$, $q$["\"Totally get it — you're slammed. This takes 30 seconds.\"", "\"I understand you're busy.\"", "\"Everyone's busy.\"", "\"I'll be quick, I promise, I swear.\""]$q$::jsonb, $q$Use their exact word.$q$),
($q$What's the most common pacing mistake?$q$, $q$["Using one speed for every prospect", "Matching too closely", "Asking questions", "Taking notes"]$q$::jsonb, $q$Adapt to each person.$q$),
($q$In 'pace, then lead', what happens after you match them?$q$, $q$["You gradually slow your pace and they tend to follow", "You speed up even more", "You hang up", "You start the price talk"]$q$::jsonb, $q$People follow your lead once matched.$q$),
($q$Why does mirroring work?$q$, $q$["People feel understood when they hear their own words", "It confuses them", "It fills silence", "It sounds scripted"]$q$::jsonb, $q$Their brain recognizes its own language.$q$)) as v(t, o, e);
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('3c2d03cb-d649-4528-ac3d-84cb930eeb12', 4, $c$Presence on Zoom$c$, $c$Win the meeting before you say a word.$c$, $c$# Presence on Zoom

On a Zoom, the owner reads you in the first few seconds — light, camera, background, posture.

---

## The setup (every meeting)
- **Camera at eye level.** Not looking up your nose.
- **Light in front of you**, not behind.
- **Clean, quiet background.** No bed, no TV.
- **Look at the lens** when you make a key point — that's eye contact.
- **Headphones** with a mic. No echo.
- Close every other tab. Have their Discovery numbers open.

---

## Body language that carries over video
- Sit up, shoulders back.
- Lean slightly in when they talk.
- **Slow, single nods** = "I hear you, I'm in control." Fast nodding = "please like me."
- Hands still, out of frame or calm.

---

## Before you join
1. Breathe once, slowly.
2. Shoulders back.
3. Say to yourself: *"I have something valuable. They need what I have."*
4. Join 2 minutes early.

!! Meetings on our Zoom are recorded automatically. Act like your team leader is watching — because they can.

?? Where do you look when you make your most important point? || At the camera lens — that's what eye contact looks like to them.$c$, 'sdr', 3) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '3c2d03cb-d649-4528-ac3d-84cb930eeb12', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$Where should your camera be?$q$, $q$["At eye level", "Below your chin", "Off to the side", "Turned off"]$q$::jsonb, $q$Eye level reads as confident and normal.$q$),
($q$Where should your main light be?$q$, $q$["In front of you", "Behind you", "Above you only", "It doesn't matter"]$q$::jsonb, $q$Backlight hides your face.$q$),
($q$How do you make eye contact on Zoom?$q$, $q$["Look at the camera lens when you make key points", "Look at their face on screen", "Look at your notes", "Close your eyes"]$q$::jsonb, $q$The lens is their eyes.$q$),
($q$What does fast, repeated nodding signal?$q$, $q$["\"Please like me\" — low status", "Confidence", "Agreement that closes", "Nothing"]$q$::jsonb, $q$Use slow, single nods.$q$),
($q$What should you have open before a discovery meeting?$q$, $q$["Their Discovery numbers", "Social media", "Email inbox", "Nothing"]$q$::jsonb, $q$Close everything else.$q$),
($q$What's true about meetings on our Zoom?$q$, $q$["They're recorded automatically", "They're never recorded", "Only the prospect can record", "Only audio is kept for a day"]$q$::jsonb, $q$Act like your team leader is watching.$q$)) as v(t, o, e);
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('3c2d03cb-d649-4528-ac3d-84cb930eeb12', 5, $c$Pattern interrupts and silence$c$, $c$Break the autopilot no.$c$, $c$# Pattern interrupts

Every owner has been cold called a hundred times. They have a script for you: *"Not interested. Busy. Already have someone."* Your job is to break it before it finishes.

---

## 5 interrupts that work on the phone

1. **Agree.** *"Totally — I figured you've probably got something in place."* They expected a fight. Agreement disarms.
2. **Curious question.** *"Quick question — when did a new client last tell you they found you online?"* A thinking brain is an open brain.
3. **Honest disarm.** *"I know you get calls like this all day. Give me 30 seconds and you'll know if it's worth two more."*
4. **Specific observation.** *"I searched for advisors in [city] — you didn't come up on the first page. Three other firms did."* Hard to dismiss because it's specific and true.
5. **Future picture.** *"Picture next month with five more qualified meetings already on your calendar."*

!! Every interrupt must be **true**. Never claim selectivity, scarcity or a referral you don't have.

---

## Strategic silence

Silence is pressure. Most people fill it. Don't.

- **3-second rule:** after a key question, count to three before you speak.
- **After the ask:** say nothing. Don't soften. Don't add. Let them answer.

[[visual:silence]]$c$, 'all', 4) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '3c2d03cb-d649-4528-ac3d-84cb930eeb12', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$Why do pattern interrupts work?$q$, $q$["They break the owner's automatic 'no' script", "They confuse the prospect", "They make the call longer", "They replace discovery"]$q$::jsonb, $q$The autopilot no runs before they listen.$q$),
($q$Which is a good curious-question interrupt?$q$, $q$["\"When did a new client last tell you they found you online?\"", "\"Can I tell you about our services?\"", "\"Do you want to buy marketing?\"", "\"Is now a bad time?\""]$q$::jsonb, $q$It makes them think instead of react.$q$),
($q$What makes the 'specific observation' interrupt powerful?$q$, $q$["It's specific and true, so it's hard to dismiss", "It's vague", "It's about you", "It mentions price"]$q$::jsonb, $q$Specific beats generic.$q$),
($q$Which interrupt is NOT allowed?$q$, $q$["\"We only take two firms per city\" when it isn't true", "Agreeing with their objection", "Asking a curious question", "Naming that they get lots of calls"]$q$::jsonb, $q$Every interrupt must be true.$q$),
($q$What's the 3-second rule?$q$, $q$["After a key question, count to three before speaking", "Hang up after three seconds of silence", "Say three benefits quickly", "Call three times a day"]$q$::jsonb, $q$Let them fill the silence.$q$),
($q$What do you do right after asking for the meeting?$q$, $q$["Stay silent and let them answer", "Add more benefits", "Soften it with 'only if you want'", "Ask a second question"]$q$::jsonb, $q$Silence after the ask is the skill.$q$)) as v(t, o, e);
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('3c2d03cb-d649-4528-ac3d-84cb930eeb12', 6, $c$Rapport and reading the owner$c$, $c$Make them feel understood fast.$c$, $c$# Rapport

People buy from people who understand them. Real rapport = they feel seen in the first 60 seconds, so the real conversation can start.

---

## Three layers
1. **Something specific about them.** Their firm's founding year, a recent move, their LinkedIn post. *"I saw you started the firm in 2009 — right after the crash?"*
2. **Show you get their world.** *"Running a practice, you're managing clients, compliance and trying to grow — all at once."*
3. **Then move.** *"Actually, that's exactly why I called."*

---

## Four kinds of owners

- **Analytical** — wants numbers and proof. Be precise, slow down.
- **Driver** — busy and decisive. Lead with the outcome fast.
- **Relational** — wants connection first. Let them talk.
- **Skeptical** — burned before. Be straight. Promise less, show more.

[[visual:owner-types]]

---

## The fastest rapport builder

Real curiosity.
- "How did you start the firm?"
- "Where do most of your new clients come from today?"
- "What does a great year look like for you?"

These build rapport **and** give you what you need for discovery.$c$, 'all', 3) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '3c2d03cb-d649-4528-ac3d-84cb930eeb12', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$What is real rapport?$q$, $q$["The prospect feels seen and understood fast", "Long small talk about weather", "Agreeing with everything", "Complimenting their office"]$q$::jsonb, $q$Then the real conversation can start.$q$),
($q$An Analytical owner wants…$q$, $q$["Numbers, specifics and proof", "Fast energy and hype", "Lots of personal stories", "No details"]$q$::jsonb, $q$Be precise.$q$),
($q$A Driver owner wants…$q$, $q$["The outcome, fast and direct", "A long relationship first", "Every technical detail", "A brochure"]$q$::jsonb, $q$Lead with the outcome.$q$),
($q$How do you handle a Skeptical owner?$q$, $q$["Be straight; promise less, show more", "Promise big numbers", "Push harder", "Avoid their questions"]$q$::jsonb, $q$They've been burned before.$q$),
($q$What's the fastest rapport builder?$q$, $q$["Genuine curiosity about them and their firm", "A joke", "Talking about yourself", "Naming our prices"]$q$::jsonb, $q$Questions build rapport and gather intel.$q$),
($q$After you've built rapport, what's next?$q$, $q$["Move — bridge to why you called", "Keep chatting as long as possible", "Hang up", "Send an email"]$q$::jsonb, $q$Momentum carries rapport into the pitch.$q$)) as v(t, o, e);
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('3c2d03cb-d649-4528-ac3d-84cb930eeb12', 7, $c$Mining and discovery$c$, $c$Find the pain and dig.$c$, $c$# Mining

The prospect is sitting on gold. Your job: hear it and dig.

Most people hear a problem and move on. Great salesmen **stop and mine it.**

---

## Listen for signals
- "Most of our clients come from referrals."
- "Growth has been flat."
- "We tried marketing — didn't work."
- "My partner's retiring and taking clients."
- "I don't know where people find us."
- "The big firm down the street is everywhere."

---

## The 4 steps
1. **Catch it.** Don't rush past.
2. **Open it.** *"Say more about that."* · *"How long has that been going on?"*
3. **Put a number on it.** *"How many new clients a year is that?"* · *"What's an average client worth to you?"*
4. **Connect to the future.** *"If we closed that gap, what would that mean for you?"*

[[visual:mining]]

---

## Why it works

People believe what **they** say more than what they hear. When they describe their own problem in detail, they feel every word. Then your solution isn't your idea — it's their answer.

!! Put the numbers they say straight into **Discovery numbers** in the app.$c$, 'sdr', 5) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '3c2d03cb-d649-4528-ac3d-84cb930eeb12', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$What is mining?$q$, $q$["Digging deeper into a pain point the prospect mentions", "Pitching every feature", "Reading a script faster", "Looking up their address"]$q$::jsonb, $q$Stop and dig instead of moving on.$q$),
($q$Which is a mining signal?$q$, $q$["\"Most of our clients come from referrals.\"", "\"Nice weather today.\"", "\"I have five minutes.\"", "\"Who is this?\""]$q$::jsonb, $q$It hints at a growth gap.$q$),
($q$What's the first thing you do when you hear a signal?$q$, $q$["Slow down and open it: \"Say more about that.\"", "Pitch immediately", "Change the subject", "Mention the price"]$q$::jsonb, $q$Let them talk.$q$),
($q$Why put a number on the pain?$q$, $q$["It makes the problem concrete and real", "To confuse them", "Numbers aren't needed", "To shorten the call"]$q$::jsonb, $q$Numbers make it felt.$q$),
($q$Why does mining work so well?$q$, $q$["People believe what they say more than what they hear", "It makes calls shorter", "It avoids discovery", "It replaces the close"]$q$::jsonb, $q$Their own words convince them.$q$),
($q$Where do the numbers they give you go?$q$, $q$["Discovery numbers in the app", "A sticky note", "Nowhere", "An email to them"]$q$::jsonb, $q$The app builds the gap from them.$q$)) as v(t, o, e);
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('3c2d03cb-d649-4528-ac3d-84cb930eeb12', 8, $c$Assumptive selling$c$, $c$Talk about 'when', not 'if'.$c$, $c$# Assumptive selling

Assumptive selling isn't a trick. It's a posture: you expect the next step to happen, and your words show it.

---

## Kill permission language
- ~~"Would you be interested in…"~~
- ~~"Is there any chance…"~~
- ~~"If you wanted to…"~~

## Use forward language
- "The next step is a 15-minute Zoom — mornings or afternoons?"
- "When we look at your numbers on Thursday…"
- "Once your calendar starts filling up…"

[[visual:assumptive]]

---

## It starts at the first sentence

If you spend ten minutes asking permission and then switch to assumptive at the end, it feels fake. **Assumption is the frame of the whole call.**

!! You're not lying. You're leading.$c$, 'all', 3) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '3c2d03cb-d649-4528-ac3d-84cb930eeb12', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$Which line is assumptive?$q$, $q$["\"The next step is a 15-minute Zoom — mornings or afternoons?\"", "\"Would you be interested in a meeting?\"", "\"Is there any chance you'd talk?\"", "\"If you wanted to, maybe we could…\""]$q$::jsonb, $q$Ask which/when, not if.$q$),
($q$Why avoid 'Would you be interested…'?$q$, $q$["It invites an easy no", "It's too long", "It sounds rude", "It's illegal"]$q$::jsonb, $q$Permission questions hand them the exit.$q$),
($q$When should assumptive language start?$q$, $q$["From the first sentence", "Only at the close", "After they agree", "Never"]$q$::jsonb, $q$Switching late feels fake.$q$),
($q$Assumptive selling is best described as…$q$, $q$["A posture that expects the next step", "Lying about results", "Pressuring them", "Skipping discovery"]$q$::jsonb, $q$You're leading, not lying.$q$),
($q$Which is forward language?$q$, $q$["\"When we look at your numbers on Thursday…\"", "\"If maybe you want…\"", "\"Do you think you might…\"", "\"Sorry to bother you…\""]$q$::jsonb, $q$Talk about when.$q$),
($q$What's the most common mistake?$q$, $q$["Using it only at the close", "Using it too early", "Smiling while talking", "Taking notes"]$q$::jsonb, $q$It's a conversation frame, not a closing trick.$q$)) as v(t, o, e);
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('3c2d03cb-d649-4528-ac3d-84cb930eeb12', 9, $c$Reading buying signals$c$, $c$They told you they were ready.$c$, $c$# Buying signals

Most lost meetings aren't lost at the close. They're lost 30 seconds earlier — the prospect showed a signal and you kept talking.

---

## What you'll hear
- "So how does this actually work?"
- "What does something like this cost?"
- "How long does it take to set up?"
- "Do you work with firms like mine?"
- "Would I have to do anything?"

Any question about **how, when, or how much** = they're moving forward.

## What you'll see on Zoom
- They lean in or move closer to the camera.
- They stop looking away / at another screen.
- They take notes.

## What you'll feel
- The pace slows. Questions get specific. The tone warms up.

---

## When you see one: stop and close

> "Let's lock in a time — mornings or afternoons?"

!! Don't add "one more great thing." That's talking past the yes.$c$, 'all', 3) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '3c2d03cb-d649-4528-ac3d-84cb930eeb12', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$Which is a buying signal?$q$, $q$["\"How long does it take to set up?\"", "\"I'm not interested.\"", "\"Who gave you my number?\"", "\"I'm busy.\""]$q$::jsonb, $q$Logistics questions mean they're moving forward.$q$),
($q$What do you do when you hear a buying signal?$q$, $q$["Stop and close", "Add one more feature", "Summarize everything", "Ask about the weather"]$q$::jsonb, $q$The signal is the invitation.$q$),
($q$A prospect asks 'What does this cost?' early. It's…$q$, $q$["Usually a buying signal", "Always an objection", "A reason to hang up", "Irrelevant"]$q$::jsonb, $q$Interest questions aren't objections.$q$),
($q$Which Zoom cue is a buying signal?$q$, $q$["They start taking notes", "They look at another screen", "They mute themselves", "They check the time"]$q$::jsonb, $q$Engagement shows interest.$q$),
($q$What's 'talking past the yes'?$q$, $q$["Pitching after they've already decided", "Closing too early", "Staying silent", "Booking the meeting"]$q$::jsonb, $q$The energy cools and the window closes.$q$),
($q$Which change in tone is a signal?$q$, $q$["Pace slows and questions get specific", "They speed up to end the call", "They go flat and short", "They interrupt to say goodbye"]$q$::jsonb, $q$Specific questions = interest.$q$)) as v(t, o, e);
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('3c2d03cb-d649-4528-ac3d-84cb930eeb12', 10, $c$Pre-close and trial close$c$, $c$Test the water before the big ask.$c$, $c$# The pre-close

Never ask the big question before you know the answer.

---

## The 4 steps
1. **Check understanding.** *"Does that make sense so far?"*
2. **Temperature check.** *"Of everything we went over, what stood out most?"*
3. **Surface the objection early.** *"What would be your biggest hesitation?"*
4. **Trial close.** *"If the timing and numbers made sense, is this something you'd want?"*

Yes → close fully. No or maybe → you know exactly what to work on.

[[visual:preclose]]

---

## Why it works
Most objections at the close are old ones nobody asked about. Ask early, handle them while the conversation is still open.$c$, 'all', 3) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '3c2d03cb-d649-4528-ac3d-84cb930eeb12', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$What's the purpose of a trial close?$q$, $q$["Test where they are before the full ask", "Close the deal immediately", "End the call politely", "Give the price"]$q$::jsonb, $q$No surprise no's.$q$),
($q$Which is a trial close?$q$, $q$["\"If the timing and numbers made sense, is this something you'd want?\"", "\"Sign here.\"", "\"Would you like a brochure?\"", "\"Can I call you next year?\""]$q$::jsonb, $q$Low stakes, reveals position.$q$),
($q$Why surface the objection before the close?$q$, $q$["So you handle it while the conversation is open", "To end the call faster", "To make them nervous", "It's not useful"]$q$::jsonb, $q$Old unasked objections kill closes.$q$),
($q$What's step 1 of the pre-close?$q$, $q$["Check understanding", "Ask for payment", "Name the price", "Send a contract"]$q$::jsonb, $q$Never close into confusion.$q$),
($q$They answer the temperature check vaguely. What does that tell you?$q$, $q$["There's more work to do", "They're ready to sign", "Hang up", "Skip to the close"]$q$::jsonb, $q$Specific = warm; vague = not yet.$q$),
($q$Trial close answer is 'maybe'. What now?$q$, $q$["Work on what's holding them back", "Close harder", "Give a discount", "End the call"]$q$::jsonb, $q$You now know what to work on.$q$)) as v(t, o, e);
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('3c2d03cb-d649-4528-ac3d-84cb930eeb12', 11, $c$Real urgency, no pressure$c$, $c$Reveal the cost of waiting — never invent it.$c$, $c$# Real urgency

Fake urgency kills trust. *"Only one spot left!"* — they've heard it a thousand times.

Real urgency comes from **their** numbers, not your deadline.

---

## Build it
1. **Their gap now.** *"You said you want 40 new clients a year and you're getting 15."*
2. **What it costs.** *"At your average client value, that gap is about [amount] a year."*
3. **Every month waiting.** *"That's roughly [amount ÷ 12] every month it stays this way."*
4. **Respect their choice.** *"I'm not saying you have to do this today. I just want you to see the real number."*

---

## Deadlines
Only use one if it's **true** — like a real onboarding start date. If it's not true, leave it out.

!! You don't create urgency. You reveal it.$c$, 'sdr', 3) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '3c2d03cb-d649-4528-ac3d-84cb930eeb12', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$Where should urgency come from?$q$, $q$["The prospect's own numbers", "A fake deadline", "A made-up scarcity", "Your monthly quota"]$q$::jsonb, $q$Real urgency is revealed.$q$),
($q$Which line is fake urgency?$q$, $q$["\"Only one spot left this week!\" (when it isn't true)", "\"That gap is about $X a month.\"", "\"Here's what waiting costs.\"", "\"I'm not saying you have to decide today.\""]$q$::jsonb, $q$Never invent scarcity.$q$),
($q$How do you turn a yearly gap into urgency?$q$, $q$["Show what each month of waiting costs", "Double the number", "Ignore it", "Hide it"]$q$::jsonb, $q$Monthly cost makes it real.$q$),
($q$Why acknowledge their autonomy?$q$, $q$["It removes pressure while the urgency stays real", "It ends the deal", "It's required by law", "It lowers the price"]$q$::jsonb, $q$Real number, no pressure.$q$),
($q$When can you use a deadline?$q$, $q$["Only when it's true", "Always", "When they hesitate", "Never mention dates"]$q$::jsonb, $q$Truth or nothing.$q$),
($q$'You don't create urgency, you ___ it.'$q$, $q$["reveal", "invent", "exaggerate", "hide"]$q$::jsonb, $q$It's already there in their numbers.$q$)) as v(t, o, e);
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('3c2d03cb-d649-4528-ac3d-84cb930eeb12', 12, $c$Reframing price and value$c$, $c$Raise the value until the price looks small.$c$, $c$# Reframing price

Price is almost never the real objection — it's doubt the money comes back. Don't lower the price. **Raise the value.**

---

## Let them do the math
> "If this brought you [the number of clients from their goal] at your average client value, what's that worth over a year?"

Now the setup isn't a cost — it's an investment with a return **they** just calculated.

---

## Four reframes

1. **Break-even.** *"How many new clients would you need for this to pay for itself?"* Usually a small number.
2. **Cost of doing nothing.** *"We saw the gap is [amount] a year. Is [setup] to close it a good trade?"*
3. **The guarantee.** *"We make your investment back in 90 days — or we keep working until we do."*
4. **Pick the right plan.** Revenue share for firms that want to pay on results. Flat **$7,000 a month** for firms that want a fixed bill (and BD-tied advisors).

[[visual:break-even]]

---

## After the yes
1. Book the next meeting **right now**, on the call.
2. Say the details back out loud.
3. Tell them exactly what happens next.
4. Fill Form 2 the same day.

!! Never promise a number of clients or investment returns. The guarantee is the guarantee.$c$, 'sdr', 4) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '3c2d03cb-d649-4528-ac3d-84cb930eeb12', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$What is a price objection usually about?$q$, $q$["Doubt that the money comes back", "Pure math", "Your personality", "The weather"]$q$::jsonb, $q$Raise the value.$q$),
($q$Best way to make price feel small?$q$, $q$["Let them calculate the return from their own numbers", "Drop the price right away", "Talk faster", "Skip it"]$q$::jsonb, $q$Their math beats yours.$q$),
($q$What's the break-even question?$q$, $q$["\"How many new clients would you need for this to pay for itself?\"", "\"Can you afford this?\"", "\"Do you want a discount?\"", "\"Is it too much?\""]$q$::jsonb, $q$Usually a small number.$q$),
($q$Which plan fits a broker-dealer-tied advisor?$q$, $q$["The flat $7,000/month option", "Revenue share only", "No plan", "Setup only forever"]$q$::jsonb, $q$Revenue share may not be allowed.$q$),
($q$Which is NOT allowed when reframing price?$q$, $q$["Promising a specific number of new clients", "Stating the 90-day guarantee", "Using their own numbers", "Asking the break-even question"]$q$::jsonb, $q$Only the guarantee as written.$q$),
($q$Right after they say yes, you…$q$, $q$["Book the next meeting on the call and confirm details", "Celebrate and hang up", "Send info later", "Wait for them to call"]$q$::jsonb, $q$Lock it in before the call ends.$q$)) as v(t, o, e);
with c as (insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes) values ('3c2d03cb-d649-4528-ac3d-84cb930eeb12', 13, $c$The full stack$c$, $c$Every skill in one call and one meeting.$c$, $c$# The full stack

You don't use these one at a time. You use them all at once.

## The call (BDR)
1. **Breathe.** Shoulders back. Intention set.
2. **Opener** — confident declaration tone. No pitch voice.
3. **Read and match** — Driver, Analytical, Relational or Skeptical?
4. **Interrupt the autopilot no** — agree, curious question, or a true observation.
5. **One rapport line, then move.**
6. **Mine one signal** — three questions deep.
7. **Trial close.**
8. **The ask** — "mornings or afternoons?" Flat tone. Then silence.
9. **Book it on the call** with your Form 1 link. Log the outcome.

---

## The meeting (SDR)
1. Zoom setup checked, numbers open, join early.
2. Rapport → **Discovery numbers** (goal, now, leads, close rate).
3. **Mine** the gap. Let them say it.
4. Show the app and the three steps.
5. **Pre-close** — check, temperature, hesitation, trial close.
6. **Real urgency** from their numbers.
7. **The offer** and the guarantee. Pick the plan.
8. **Close** — then silence.
9. **Fill Form 2** and book the closing meeting before you hang up.

[[visual:full-stack]]

---

## Your recordings are your mirror

Every Zoom on our account is recorded. Watch one a day. Find **one** thing that cost you. Fix it. Repeat.$c$, 'all', 4) returning id)
insert into nl_training_questions (chapter_id, module_id, question_type, quiz_level, question_text, options, correct_index, explanation)
select c.id, '3c2d03cb-d649-4528-ac3d-84cb930eeb12', 'chapter_quiz', 1, v.t, v.o, 0, v.e from c, (values
($q$What's the first step before every call?$q$, $q$["Breathe and set your intention", "Read the price", "Send an email", "Check social media"]$q$::jsonb, $q$Presence first.$q$),
($q$On a call, when do you ask for the meeting?$q$, $q$["After the trial close, with a flat 'mornings or afternoons?'", "In the first sentence", "Never — wait for them", "After sending a brochure"]$q$::jsonb, $q$Then hold the silence.$q$),
($q$How do you book the first meeting on a call?$q$, $q$["With your Form 1 link while you're still on the phone", "Tell them to look you up", "Send info and wait", "Ask them to call back"]$q$::jsonb, $q$It's only real once it's booked.$q$),
($q$In the meeting, what comes right after rapport?$q$, $q$["Discovery numbers", "The price", "Pay & Sign", "The guarantee"]$q$::jsonb, $q$Their numbers come first.$q$),
($q$What do you do before hanging up after a won discovery?$q$, $q$["Fill Form 2 and book the closing meeting", "Nothing", "Send a thank-you text only", "Wait a week"]$q$::jsonb, $q$Lock the next step.$q$),
($q$How should you use your meeting recordings?$q$, $q$["Watch one a day and fix one thing", "Never watch them", "Delete them", "Send them to the prospect"]$q$::jsonb, $q$Recordings are your mirror.$q$)) as v(t, o, e);
update nl_training_modules set module_description=$c$The core craft for the phone and Zoom: tonality, pacing, rapport, discovery, urgency and value.$c$, tagline=$c$The craft$c$ where id='3c2d03cb-d649-4528-ac3d-84cb930eeb12';