-- Module 7: keep the original objection material; add "you'll hear it in different ways" + funnel lines.
do $$
declare m uuid := '49e85e03-72b0-4297-95ec-03d60f7db51c';
begin
  -- New chapter 2: the funnel idea.
  insert into nl_training_chapters (module_id, chapter_number, chapter_title, chapter_description, content, audience, est_minutes)
  values (m, 2, $c$You'll Hear It in Different Ways$c$, $c$Same objection, a hundred wordings. Funnel them into the one you know how to handle.$c$, $c$# You'll Hear It in Different Ways

Prospects almost never say the objection the way it's written in this module.

You won't hear "I'm not interested" every time. You'll hear "We're good." "We're all set." "Now's not a good time." "We get our clients from referrals."

**It's the same objection.** You don't need a new answer for every wording.

---

## Funnel it into the one you handle

1. **Hear it** — whatever words they use.
2. **Say it back as the objection you know** — out loud.
3. **Run the play** from that objection's chapter.

> They say: "I don't see the value."
> You say: "Okay, I hear you — you aren't interested."

> They say: "We're all set, thanks."
> You say: "I understand, you aren't interested."

> They say: "That's a lot of money for us right now."
> You say: "I know it's out of your budget right now. But can I make a suggestion?"

Now you're in a conversation you've practiced 100 times.

[[visual:objection-funnel]]

---

## Why it works

- They feel heard — you put their meaning into plain words.
- You move the conversation onto **your** ground.
- You only have to master a handful of plays, not hundreds of lines.

!! Match what they **mean**, not the exact words. Every objection chapter in this module starts with a list of the ways you'll actually hear it.$c$, 'all', 4);

  update nl_training_chapters set content = regexp_replace(content, '^(# [^\n]*\n)', E'\\1\n## You''ll hear it as\n- "I don''t see the value."\n- "What would this even do for us?"\n- "We''re doing fine."\n- "That''s not really our thing."\n- "I don''t see how this helps a firm like ours."\n- "Sounds like every other agency."\n\nSame objection. Funnel it, then use the lines below.\n\n---\n') where module_id=m and chapter_number=3;

  update nl_training_chapters set content = regexp_replace(content, '^(# [^\n]*\n)', E'\\1\n## You''ll hear it as\n- "Not interested."\n- "We''re good."\n- "We''re all set."\n- "No thanks."\n- "Not looking for anything right now."\n- "We get all our clients from referrals."\n- "I''m busy."\n\nSame objection. Funnel it, then use the lines below.\n\n---\n') where module_id=m and chapter_number=4;

  update nl_training_chapters set content = regexp_replace(content, '^(# [^\n]*\n)', E'\\1\n## You''ll hear it as\n- "That''s too expensive."\n- "That''s a lot of money."\n- "It''s not in the budget."\n- "We can''t afford that right now."\n- "Can you do it for less?"\n- "Your competitor is cheaper."\n\nSame objection. Funnel it, then use the lines below.\n\n---\n') where module_id=m and chapter_number=5;

  update nl_training_chapters set content = regexp_replace(content, '^(# [^\n]*\n)', E'\\1\n## You''ll hear it as\n- "Everyone says that."\n- "How do I know this works?"\n- "Sounds too good to be true."\n- "Can you guarantee results?"\n- "I''ve heard this pitch before."\n- "Marketing doesn''t work for firms like mine."\n\nSame objection. Funnel it, then use the lines below.\n\n---\n') where module_id=m and chapter_number=6;

  update nl_training_chapters set content = regexp_replace(content, '^(# [^\n]*\n)', E'\\1\n## You''ll hear them as\n**Not interested:** "We''re good." · "All set." · "No thanks." · "Not looking right now." · "I''m busy."\n\n**Don''t see the value:** "What would this even do for us?" · "We''re doing fine." · "Our clients don''t come from online."\n\n---\n') where module_id=m and chapter_number=9;

  update nl_training_chapters set content = regexp_replace(content, '^(# [^\n]*\n)', E'\\1\n## You''ll hear them as\n**Need to think:** "Let me sleep on it." · "Call me next quarter." · "Maybe after tax season." · "Now''s not a good time." · "Let''s revisit in the new year."\n\n**Need to talk to someone:** "My partner handles that." · "I''m not the decision maker." · "I''ll run it by the other advisors." · "My wife and I decide together."\n\n---\n') where module_id=m and chapter_number=10;

  update nl_training_chapters set content = regexp_replace(content, '^(# [^\n]*\n)', E'\\1\n## You''ll hear them as\n**Too expensive:** "That''s a lot." · "Not in the budget." · "We can''t swing that." · "Can you do it for less?"\n\n**What''s your pricing:** "What does this cost?" · "Just give me a number." · "Ballpark?"\n\n---\n') where module_id=m and chapter_number=11;

  update nl_training_chapters set content = regexp_replace(content, '^(# [^\n]*\n)', E'\\1\n## You''ll hear them as\n**Bad experience:** "We tried an agency — wasted money." · "We did ads once, nothing came of it."\n\n**Already have someone:** "We''re happy with who we have." · "Our home office does our marketing." · "My nephew does our website."\n\n**In-house:** "We handle it ourselves." · "We have a marketing person."\n\n---\n') where module_id=m and chapter_number=12;

  -- Chapter 15 was a stub.
  update nl_training_chapters set chapter_description = $c$The polite brush-off.$c$, est_minutes = 3, content = $c$# Objection — "We Will Reach Out"

## You'll hear it as
- "We'll reach out if we're interested."
- "Just send me an email."
- "Send me some info."
- "Do you have a website?"
- "I'll look you up."

Same objection — a polite way to end the call. Funnel it, then:

---

## Agree, then make it specific
> "Happy to. So I don't send you something generic — what would you want it to answer?"

Their answer is the real objection. Handle that one.

## Book the next step anyway
> "I'll send it right now. Let's grab 15 minutes Thursday to go over it together — morning or afternoon?"

## If they still say "we'll reach out"
> "Sounds good. Just so it doesn't fall through the cracks on either side — can I put a quick check-in on the calendar for [date]? If it's not a fit by then, you tell me and I'm gone."

!! Never hang up without a date for the next touch.$c$ where module_id=m and chapter_number=15;
end $$;
