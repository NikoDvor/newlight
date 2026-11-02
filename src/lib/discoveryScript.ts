import { supabase } from "@/integrations/supabase/client";

/**
 * The Meeting 1 — Discovery script, read live from the training (Module 6, chapter 2)
 * so the Calculator always shows the same words salesmen learn. Split into steps at
 * its "## n." headings; "➜" hint lines are dropped because the Calculator puts the
 * real entry boxes there instead.
 */
export interface ScriptStep {
  key: string;      // "1", "1b", "4", "7b" …
  title: string;    // "Goal"
  body: string;     // markdown
}
export interface DiscoveryScript {
  steps: ScriptStep[];
  note: string | null;
}

export async function loadDiscoveryScript(): Promise<DiscoveryScript> {
  try {
    const { data } = await (supabase as any)
      .from("nl_training_chapters").select("content")
      .ilike("chapter_title", "Meeting 1%Discovery%").limit(1).maybeSingle();
    if (data?.content) return parseScript(String(data.content));
  } catch { /* fall back */ }
  return parseScript(FALLBACK);
}

export function parseScript(raw: string): DiscoveryScript {
  const text = raw.replace(/\r\n/g, "\n");
  const [main, ...rest] = text.split(/\n-{3,}\s*\n/);
  const note = rest.join("\n").replace(/^>\s?/gm, "").replace(/\*\*Note:\*\*\s*/i, "").trim() || null;
  const parts = main.split(/\n(?=## )/);
  const steps: ScriptStep[] = [];
  for (const p of parts) {
    const m = p.match(/^##\s*(\d+[a-z]?)\.?\s*(.*)\n?([\s\S]*)$/i);
    if (!m) continue;
    const body = m[3]
      .split("\n")
      .filter((l) => !/^\s*-\s*➜/.test(l))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    steps.push({ key: m[1].toLowerCase(), title: m[2].trim(), body });
  }
  return { steps, note };
}

const FALLBACK = `# Meeting 1 — Discovery

## 1. Goal
> "Over the next year, what are your goals for households and revenue?"

- **If they say "I don't know":** get them dreaming.
  > "In a perfect world, a year from now, what would those numbers look like for you?"

## 1b. Where they are now
> "And where are you at right now for households and revenue?"

- Clarify: "Is that monthly or annually?"
- Clarify the average ticket: "So that puts your average client at about (x). Does that sound right?"

## 2. Where business comes from
> "What are you doing right now to bring in new business?"

- If the answer is vague: "Where are most of your clients coming from: referrals, seminars, something else?"

## 3. Online
> "How many of those new clients are coming from online?"

- "When you say online, which channels are you thinking of?"

## 4. Leads and close rate
> "How many new clients have you brought on in the last 12 months?"
> "And on average, how many leads does it take you to land one client?"

## 5. Show the app
Tap **Calculations** and **share your screen now**.
**Bring the energy** — this is the big moment.

## 6. Our contribution
> "What revenue increase would it take from us to make it worth working together to hit your goal?"

## 7. Confirm
> "So you're at (x), your goal is (x), the gap is worth (x) this year, and you said you wouldn't be happy staying here. If we can contribute what's needed to support that goal, working together makes sense. Did I get that right?"

*(Stop sharing your screen.)*

## 7b. Decision maker
Always confirm this before moving on.
> "And just so I know who to include — are you the one who makes the final call on this, or is anyone else involved?"

- **If someone else is involved:** "Great — let's make sure they're on our next meeting, so you're not stuck relaying everything." Get their name and add them as an attendee on Form 2.

## 8.
**8a.** "Then what would stop us from moving forward today?"
**8b.** "If we solved those things, there'd be no reason to hold back today, correct?"

## 9.
> "What would have to happen to solve those things today?"

---

> **Note:** The numbers save to the lead automatically. Reopen them on Meeting 2 to recap their own words. Form 2 gets filled at the **end of this meeting** to schedule Meeting 2.
`;
