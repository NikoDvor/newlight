/**
 * Client Showcase content — the pipeline NewLight builds for a client firm, by type of firm and package.
 * Used by the Client Showcase page (/employee/showcase, /admin/showcase). Prices are NOT here: they come from
 * src/lib/packages.ts so the showcase always matches Close Prep and Pay & Sign.
 * Who codes: lead = prospect, rep = advisor, admin = firm owner, nl = NewLight team, robot = automatic, data = saved/measured.
 */
export type Niche = "advisor" | "ria" | "hybrid" | "insurance";
export type PkgKey = "growth" | "cc" | "ent";
export type Who = "lead" | "rep" | "admin" | "nl" | "robot" | "data" | "";
export interface Box { h: string; items: [Who, string][] }
export interface Station {
  id: string; z: string; t: string; small: string; d: string; kid: string; feat: string[];
  hang: [Who, string][]; boxes: Box[]; tag?: [string, string]; results?: boolean; end?: boolean;
}
export interface Pkg { k: PkgKey; l: string; steps: number[]; who: string; get: string[]; pricingKey: "growth" | "command_center" | "enterprise" }

export const NICHES: { k: Niche; l: string }[] = [{ k: "advisor", l: "Financial advisor" }, { k: "ria", l: "RIA" }, { k: "hybrid", l: "Hybrid" }, { k: "insurance", l: "Insurance" }];
export const PKGS: Pkg[] = [
  { k: "growth", l: "Growth", pricingKey: "growth", steps: [2], who: "For firms that want more qualified meetings on the calendar.",
    get: ["Step 2 · Fill the Calendar", "Paid campaigns aimed at their ideal client", "Landing page, booking form and qualifying questions", "Confirmations and reminders so people show up", "90-day guarantee: if the setup isn't made back, we keep working at no extra charge until it is"] },
  { k: "cc", l: "Command Center", pricingKey: "command_center", steps: [3], who: "For firms that already get meetings but lose too many of them.",
    get: ["Step 3 · Win the Client", "Their own branded Command Center app", "A client pipeline from booked meeting to won client", "Every meeting outcome logged, leaks and objections flagged", "Strategy adjusted from what the data shows"] },
  { k: "ent", l: "Enterprise", pricingKey: "enterprise", steps: [1, 2, 3], who: "For firms that want the whole system and to own their market.",
    get: ["Steps 1 + 2 + 3 · Get Found, Fill the Calendar, Win the Client", "An exclusive metro market: we won't work with their competitors there", "A dedicated strategist", "Every meeting traced back to the campaign that produced it"] },
];
export const STEPS: Record<number, { t: string; s: string; c: string }> = { 1: { t: "Get Found", s: "Market research and organic visibility", c: "s1" }, 2: { t: "Fill the Calendar", s: "Paid traffic turned into qualified appointments", c: "s2" }, 3: { t: "Win the Client", s: "More booked appointments become won clients", c: "won" } };
export const ZONES: Record<string, { l: string; c: string }> = { s1: { l: "Step 1 · Get Found", c: "s1" }, s2: { l: "Step 2 · Fill the Calendar", c: "s2" }, booked: { l: "Booked", c: "cold" }, meet: { l: "Meeting", c: "warm" }, prop: { l: "Proposal and signing", c: "hot" }, won: { l: "", c: "won" } };
export const inv = (n: Niche) => n !== "insurance";
export const WON = (n: Niche) => inv(n) ? "Funded" : "Placed";
export const NW: Record<Niche, string> = { advisor: "advisor", ria: "RIA", hybrid: "hybrid firm", insurance: "agency" };

export const Q1: Record<Niche, string[]> = {
  advisor: ["Roughly how much they have invested", "What they want help with: retirement, income, college, a windfall", "Who they work with now", "When they want to make a change", "Who else decides with them"],
  ria: ["Investable assets compared to the firm's minimum", "Goals and how complex things are: taxes, estate, business ownership", "Who they work with now and what they pay", "When they want to make a change", "Spouse or other decision makers"],
  hybrid: ["Roughly how much they have invested", "Fee-based account, commission account, or not sure yet", "Products they already own, like annuities or insurance", "Goals and timeline", "Who else decides with them"],
  insurance: ["Coverage they need: life, disability, long-term care, annuity", "Age and basic health questions", "Monthly budget", "Policies they already have", "Who they want to protect"],
};
const F2: Record<Niche, { t: string; d: string; kid: string; l: string[] }> = {
  advisor: { t: "Recommendation and pricing", d: "You write up your recommendation and how they'll pay for it: an advisory fee or a commission.", kid: "You write down your plan for them and what it costs.", l: ["The recommendation, written up for them", "Advisory fee or commission, shown clearly", "Your firm's pricing rules applied the same way every time"] },
  ria: { t: "Plan and fee schedule", d: "You write up the plan and the advisory fee straight from your fee schedule, like 1% on the first $1M and less above it.", kid: "You write down your plan for them and what it costs.", l: ["The financial plan or proposal", "Advisory fee from your tiered fee schedule", "Planning fee, if you charge one", "Same pricing rules on every proposal"] },
  hybrid: { t: "Plan and account choice", d: "You write up the plan and mark each account advisory (fee) or brokerage (commission), with what each one costs.", kid: "You write down your plan and which kind of account fits each part.", l: ["The plan or proposal", "Each account marked advisory or brokerage", "The cost of each, side by side"] },
  insurance: { t: "Needs analysis and quote", d: "You work out how much coverage they need and attach the carrier quote or illustration.", kid: "You figure out how much coverage they need and what it will cost.", l: ["Needs analysis: how much coverage and why", "Carrier quote or illustration", "Options side by side if you show more than one carrier"] },
};
const F3: Record<Niche, { t: string; l: string[] }> = {
  advisor: { t: "Disclosures, agreement and account forms", l: ["Client relationship summary (Form CRS)", "Best-interest (Reg BI) disclosures", "New account forms"] },
  ria: { t: "Disclosures and advisory agreement", l: ["Client relationship summary (Form CRS)", "Advisory brochure and supplement (Form ADV Part 2A and 2B)", "Investment advisory agreement"] },
  hybrid: { t: "Disclosures, agreements and account forms", l: ["Client relationship summary (Form CRS) covering both kinds of accounts", "Advisory brochure (Form ADV Part 2) for advisory accounts", "Advisory agreement and brokerage account forms"] },
  insurance: { t: "Application signed", l: ["Insurance application", "Replacement forms if an existing policy is being replaced", "Annuity best-interest forms where the state requires them"] },
};

const box = (h: string, items: [Who, string][]): Box => ({ h, items });
/* who codes: lead, rep, admin, nl, robot, data */
const S1 = (n: Niche): Station[] => [
  { id: "research", z: "s1", t: "Market and competitor research", small: "Step 1",
    d: "Before we build anything, we study the firm's market: who their best clients are, what those people search for, and which competing firms show up instead of them.",
    kid: "We look around your town to see who your best clients are and which other firms they're finding right now.",
    feat: ["Ideal client profile", "Competitor map", "Search demand"],
    hang: [["nl", "Study the market"], ["nl", "Map the competitors"], ["data", "Ideal client written down"]],
    boxes: [box("NewLight team does", [["nl", "Defines the ideal client by life stage, " + (inv(n) ? "assets and goals" : "coverage need and budget")], ["nl", "Maps the firms that rank, advertise and get recommended locally"], ["nl", "Finds the questions and searches those clients actually type"]]),
      box("Firm does", [["admin", "A kickoff call: who their best clients are today and who they want more of"]]),
      box("What you get", [["data", "A written market plan that Steps 1 and 2 are built on"]]),
      box("Goal", [["", "Know exactly who to reach and who you're up against."]])] },
  { id: "seo", z: "s1", t: "Website and SEO", small: "Step 1",
    d: "We build or rebuild the website around what the firm's clients actually search for, with a booking button on every page.",
    kid: "We make your website easy to find on Google when people look for help like yours.",
    feat: ["Search-built pages", "Local SEO", "Google Business Profile", "Booking buttons"],
    hang: [["nl", "Build pages around real searches"], ["nl", "Local SEO + Google profile"], ["lead", "Prospect finds the site"]],
    boxes: [box("NewLight team does", [["nl", "Pages built around the searches from the research"], ["nl", "Local SEO and Google Business Profile"], ["nl", "Clear booking buttons on every page"]]),
      box("Compliance", [["", n === "insurance" ? "Content follows state insurance advertising rules" : "Content written to fit the SEC Marketing Rule" + (n !== "ria" ? ", with FINRA review where it applies" : "")]]),
      box("Measured", [["data", "Where the firm ranks for its key searches"], ["data", "Website visits and booking clicks"]]),
      box("Goal", [["", "Show up when people in your area search for what you do."]])] },
  { id: "ai", z: "s1", t: "AI search visibility", small: "Step 1",
    d: "More people now ask ChatGPT and other AI tools who to call. We make sure the firm's information is clear and consistent everywhere those tools look.",
    kid: "Lots of people now ask AI who to call. We help the AI know about you.",
    feat: ["Consistent listings", "Answer-style content", "Mention tracking"],
    hang: [["nl", "Firm info made consistent"], ["nl", "Answers AI tools can use"], ["data", "Mentions tracked"]],
    boxes: [box("NewLight team does", [["nl", "Makes the firm's details consistent across the web"], ["nl", "Publishes content that answers the questions AI tools pull from"], ["nl", "Tracks when and where the firm gets named"]]),
      box("Goal", [["", "Get named when someone asks an AI tool for a recommendation."]])] },
  { id: "content", z: "s1", t: "Content and social media", small: "Step 1",
    d: "A steady flow of helpful posts on LinkedIn and the channels their clients use, so people trust the firm before they ever meet.",
    kid: "We post helpful things for you every week so people start to trust you before they meet you.",
    feat: ["Posting plan", "Educational posts", "Best posts boosted"],
    hang: [["nl", "Posts every week"], ["lead", "People start to recognize the firm"], ["data", "Reach and engagement tracked"]],
    boxes: [box("NewLight team does", [["nl", "A steady posting plan on LinkedIn and the channels their clients use"], ["nl", "Educational posts on the topics clients ask about"], ["nl", "Pushes the best posts further"]]),
      box("Firm does", [["admin", "Approves posts (and sends them through compliance review if required)"]]),
      box("Goal", [["", "Become the familiar, trusted name in the market. Step 2 turns that attention into meetings."]])] },
];
const S2 = (n: Niche, growth: boolean): Station[] => {
  const a: Station[] = [];
  a.push(
    { id: "target", z: "s2", t: "The ideal client", small: "Step 2",
      d: inv(n) ? "We decide exactly which households to reach: life stage, goals and assets that fit the firm's minimum, in the area the firm serves." : "We decide exactly who to reach: the coverage they need, their age range and household, in the states the agency is licensed in.",
      kid: "First we decide exactly who we want to meet with, so nobody's time gets wasted.",
      feat: ["Who", "Where", "Minimum"],
      hang: [["nl", "Pick who to reach"], ["admin", "Firm approves the target"]],
      boxes: [box("NewLight team does", inv(n) ? [["nl", "Life stage and goals (retirement, income, business owners)"], ["nl", "Asset range that fits the firm's minimum"], ["nl", "The area the firm serves"]] : [["nl", "Coverage type: life, disability, long-term care, annuities"], ["nl", "Age range and household situation"], ["nl", "States the agency is licensed in"]]),
        box("Firm does", [["admin", "Approves the target and the minimum"]]),
        box("Goal", [["", "Spend only on people who could become clients."]])] },
    { id: "ads", z: "s2", t: "Paid campaigns", small: "Step 2",
      d: "Ads, boosted posts and seeded content placed where the ideal client already spends time, all pointing to one action: book a meeting.",
      kid: "We show your ads to the right people online, so they see you and want to talk.",
      feat: ["Paid ads", "Boosted content", "Seeded posts"],
      hang: [["nl", "Run the ads"], ["lead", "Prospect sees the firm"], ["data", "Cost per meeting tracked"]],
      boxes: [box("NewLight team does", [["nl", "Builds and runs the campaigns"], ["nl", "Recommends the ad budget in writing"], ["nl", "Moves money to the ads that book meetings"]]),
        box("Firm does", [["admin", "Pays the ad platforms directly at the recommended budget"]]),
        box("Compliance", [["", n === "insurance" ? "Ads follow state insurance advertising rules" : "Ads written to fit the SEC Marketing Rule" + (n !== "ria" ? ", with FINRA approval where required" : "")]]),
        box("Measured", [["data", "Cost per click, cost per booked meeting"], ["data", "Which ad booked which meeting"]]),
        box("Goal", [["", "Put the firm in front of the right people every day."]])] },
    { id: "landing", z: "s2", t: "Landing page and booking form", small: "Step 2",
      d: "One page with one job: book a meeting. It shows the firm's real open times and works fast on phones." + (growth ? "" : " The booking form is Form 1, the first stop of Step 3."),
      kid: "When someone clicks the ad, they land on a simple page where they can pick a time to talk.",
      feat: ["One clear offer", "Real calendar", "Fast on phones"],
      hang: [["lead", "Prospect lands on the page"], ["lead", "Picks a time"]],
      boxes: [box("NewLight team does", [["nl", "Builds and tests the page"], ["nl", "Connects it to the firm's real calendar"]]),
        box("Measured", [["data", "Visits to bookings"]]),
        box("Goal", [["", "Turn clicks into booked times."]])] },
  );
  if (growth) a.push(
    { id: "qualify", z: "s2", t: "Qualifying questions", small: "Step 2",
      d: "A few short questions on the booking form, so every meeting on the calendar is worth taking.",
      kid: "Before they book, they answer a few quick questions so you know you can help them.",
      feat: ["Short form", "Minimum check"],
      hang: [["lead", "Answers a few questions"], ["robot", "Below minimum? Polite not-a-fit"]],
      boxes: [box("Questions for a " + NW[n], Q1[n].map((q): [Who, string] => ["lead", q])), box("Goal", [["", "Fewer wasted meetings."]])] },
    { id: "booked2", z: "s2", t: "Booked and reminded", small: "Step 2",
      d: "The meeting goes on the calendar with a video link. Both sides get a confirmation right away and reminders before the meeting.",
      kid: "They pick a time, it goes on your calendar, and we remind everyone so nobody forgets.",
      feat: ["Video link", "Confirmations", "Reminders"],
      hang: [["robot", "Video link + calendar"], ["robot", "Confirmations to both"], ["robot", "Reminders before"]],
      boxes: [box("Automatic", [["robot", "Video link made"], ["robot", "Confirmation to both sides right away"], ["robot", "Reminders before the meeting, texts only with consent"]]),
        box("Measured", [["data", "Meetings booked"], ["data", "Show-up rate"]]), box("Goal", [["", "More people actually show up."]])] },
    { id: "handoff", z: "s2", end: true, t: "Meeting on your calendar", small: "Hand-off",
      d: "Growth stops here. The meeting is on the calendar and what happens in it is up to the firm. Step 3 adds the full pipeline from this point on.",
      kid: "You get the meeting. What happens next is up to you.",
      feat: ["Hand-off"], tag: ["dec", "To decide: how won clients are counted"] as [string, string],
      hang: [["rep", "Advisor runs the meeting"], ["data", "Clients we brought: how they're counted is to decide"]],
      boxes: [box("Open question", [["", "The commission option pays 25% of first-year revenue per new client, so we need a way to know which meetings became clients: a light tracker, or the firm reports them."]]),
        box("Goal", [["", "Qualified meetings on the calendar, every week."]])] },
  );
  return a;
};
const S3 = (n: Niche, fromAds: boolean): Station[] => {
  const f2 = F2[n], f3 = F3[n];
    return [
    { id: "booked", z: "booked", t: "Meeting booked", small: "Start",
      d: (fromAds ? "Every meeting the campaigns book lands here automatically." : "A prospect picks a time on the firm's booking page: from the website, an ad, a referral link or an event.") + " The app creates the meeting, the video link and their record, and tags where they came from.",
      kid: "Someone picks a time to meet you, and the app writes their name down right away.",
      feat: ["Booking page", "Video link", "Source tag", "Instant alert"],
      hang: [["lead", "Prospect picks a time"], ["robot", "Video link + calendar invite"], ["robot", "Confirmations to both"], ["data", "Saved with where they came from"]],
      boxes: [box("Prospect does", [["lead", "Picks a time on the booking page"], ["lead", "Gets a confirmation by email, and by text if they agreed"]]),
        box("Advisor does", [["rep", "Nothing. It's already on the calendar"], ["rep", "Gets a new-booking alert"]]),
        box("Automatic", [["robot", "Creates the video link and calendar invite"], ["robot", "Sends confirmations to both sides"], ["robot", "Starts the reminder schedule"], ["robot", "Tags the source: website, ad, referral, event, " + (inv(n) ? "CPA or attorney" : "partner")]]),
        box("Saved", [["data", "Prospect record, meeting, source, advisor, time booked"]]),
        box("Shows up", [["rep", "Advisor's calendar and the Booked column"], ["admin", "Firm owner's dashboard: new meetings this week"]]),
        box("Measured", [["data", "Meetings booked by source and by advisor"]])] },
    { id: "form1", z: "booked", t: "Form 1 · Qualifying questions", small: "Form 1", tag: ["tpl", "Template"] as [string, string],
      d: "The booking page asks a few questions before they confirm. The advisor walks into the first meeting already knowing what matters, and anyone below the firm's minimum gets a polite not-a-fit path.",
      kid: "Before you meet, they answer a few questions so you know how you can help.",
      feat: ["Editable questions", "Minimum check", "Answers on the meeting card"],
      hang: [["lead", "Answers a few questions"], ["robot", "Below minimum? Not-a-fit path"], ["robot", "Started but didn't finish? Advisor alerted"]],
      boxes: [box("Starting questions for a " + NW[n], Q1[n].map((q): [Who, string] => ["lead", q])),
        box("Firm owner does", [["admin", "Edits the questions: add, remove, reword"], ["admin", "Sets the minimum"]]),
        box("Automatic", [["robot", "Below the minimum: a polite not-a-fit email and a follow-up date"], ["robot", "Started the form but didn't book: advisor gets an alert to call"]]),
        box("Saved", [["data", "Every answer, on the prospect's record"]]),
        box("Measured", [["data", "How many start vs finish the form"], ["data", "Share that meet the minimum"]])] },
    { id: "remind", z: "booked", t: "Reminders and show-up", small: "Before the meeting",
      d: "Both sides get reminders before the meeting. If the prospect needs to move it, they can do it themselves from the link.",
      kid: "We send friendly reminders to you and to them, so nobody forgets.",
      feat: ["24 hours", "3 hours", "15 minutes", "Self-reschedule"],
      hang: [["robot", "Reminders 24h · 3h · 15m"], ["lead", "Can move it from the link"], ["rep", "Advisor gets a prep summary"]],
      boxes: [box("Automatic", [["robot", "Confirmation right away"], ["robot", "Reminders 24 hours, 3 hours and 15 minutes before"], ["robot", "Texts only to people who agreed to get them"], ["robot", "A reschedule link in every message"]]),
        box("Advisor gets", [["rep", "The same reminders, plus the Form 1 answers to prepare"]]),
        box("Saved", [["data", "Every message sent, with the time it went out"]]),
        box("Measured", [["data", "Show-up rate, by source and by how far out it was booked"]])] },
    { id: "m1", z: "meet", t: "Meeting 1 · Discovery", small: "Meeting 1", results: true,
      d: "The advisor meets the prospect, listens and learns what they need. When it ends, the app asks two quick questions: did they show up, and how did it go?",
      kid: "You meet, you listen, and then you tell the app how it went.",
      feat: ["Outcome in two taps", "Objection saved", "Next meeting booked on the call"],
      hang: [["rep", "Runs the meeting"], ["rep", "Logs: showed up? how did it go?"], ["data", "Result + objection saved"], ["robot", "No outcome? Flagged overdue"]],
      boxes: [box("Advisor does", [["rep", "Runs the meeting"], ["rep", "Logs attendance and the result: moved forward, another meeting first, rescheduled, or lost"], ["rep", "Picks the main objection, if there was one"], ["rep", "Moved forward: fills Form 2 and books Meeting 2 before hanging up"]]),
        box("Automatic", [["robot", "A meeting with no outcome shows as overdue"], ["robot", "Firm owner sees every overdue outcome"]]),
        box("Saved", [["data", "Attendance, result, objection, notes and meeting number"]]),
        box("Shows up", [["rep", "Advisor's 'Needs an outcome' list"], ["admin", "Firm owner's results page"]]),
        box("Measured", [["data", "Show-up rate"], ["data", "Share that move forward"], ["data", "Top objections at meeting 1"]])] },
    { id: "extra1", z: "meet", t: "Another meeting before the proposal", small: "Extra meeting", results: true,
      d: "They came, but want one more talk before the proposal. Maybe a spouse needs to be there, or they want to bring statements. This isn't a reschedule. It's counted as its own extra meeting.",
      kid: "They liked it, but want to talk once more before deciding.",
      feat: ["Pick a time or send a link", "Reason saved", "Counted separately"],
      hang: [["lead", "Wants one more talk"], ["rep", "Picks a time or sends the link"], ["data", "Counted as follow-up #1, #2…"]],
      boxes: [box("Advisor does", [["rep", "Picks a time now, or sends their meeting link"], ["rep", "Picks why: needs the decision maker, needs more info, wants to think, review numbers, ran out of time"]]),
        box("Automatic", [["robot", "Confirmations and reminders to both sides"], ["robot", "Logged with the same four results afterward"]]),
        box("Saved", [["data", "Follow-up number, reason and outcome"]]),
        box("Measured", [["data", "How many meetings it takes to reach the proposal"], ["data", "Share of each result at meeting 2, 3, 4+"]])] },
    { id: "missed", z: "meet", t: "Missed or rescheduled", small: "Detour",
      d: "The meeting didn't happen. The prospect gets an easy link to pick a new time, and a 72-hour clock starts so nobody slips away quietly.",
      kid: "They missed it, so we send them an easy way to pick a new time.",
      feat: ["Rebook link", "72-hour clock", "Try 2, try 3"],
      hang: [["robot", "Rebook link sent"], ["robot", "72-hour clock starts"], ["lead", "Picks a new time"]],
      boxes: [box("Prospect does", [["lead", "Rebooks from the link"]]),
        box("Advisor does", [["rep", "Or picks a new time with them"]]),
        box("Automatic", [["robot", "Rebook link goes out right away"], ["robot", "Advisor reminded before the 72 hours run out"], ["robot", "No new time after 72 hours: moved to the follow-up lane"]]),
        box("Saved", [["data", "Try 2, try 3 of the same meeting"]]),
        box("Measured", [["data", "No-show rate"], ["data", "Share rebooked within 72 hours"]])] },
    { id: "form2", z: "prop", t: "Form 2 · " + f2.t, small: "Form 2", tag: ["tpl", "Template"] as [string, string],
      d: f2.d + " The closing meeting is booked before the first meeting ends.",
      kid: f2.kid,
      feat: ["Editable template", "Pricing rules", "Meeting 2 booked"],
      hang: [["rep", "Fills the proposal"], ["rep", "Books Meeting 2 with every decision maker"], ["robot", "Confirmations + reminders"]],
      boxes: [box("What's in it", f2.l.map((x): [Who, string] => ["rep", x])),
        box("Firm owner does", [["admin", "Sets the template and " + (inv(n) ? "fee schedule" : "carrier options")], ["admin", "Approves anything below the firm's pricing rules"]]),
        box("Automatic", [["robot", "Confirmations and reminders for Meeting 2"]]),
        box("Saved", [["data", "The proposal, the price and the booked closing meeting"]]),
        box("Measured", [["data", "Share of first meetings that reach a proposal"], ["data", inv(n) ? "Average proposed account size" : "Average proposed premium"]])] },
    { id: "m2", z: "prop", t: "Meeting 2 · Closing", small: "Meeting 2", results: true,
      d: "The advisor walks them through the proposal and they decide, ideally while still on the call.",
      kid: "You show them the plan, answer their questions, and they decide.",
      feat: ["Same outcome in two taps", "Objection saved", "Sign on the call"],
      hang: [["rep", "Presents the proposal"], ["lead", "Decides"], ["rep", "Yes? Sends Form 3 on the call"], ["robot", "Goes quiet too long? Closed out"]],
      boxes: [box("Advisor does", [["rep", "Presents the proposal"], ["rep", "Logs the result and objection"], ["rep", "Yes: sends Form 3 while still on the call"]]),
        box("Automatic", [["robot", "A proposal that goes quiet too long is closed out as 'went silent' and moved to follow-up, so the numbers stay honest"]]),
        box("Saved", [["data", "Result, objection and notes"]]),
        box("Measured", [["data", "Close rate"], ["data", "Top objections at the close"]])] },
    { id: "extra2", z: "prop", t: "Another meeting before signing", small: "Extra meeting", results: true,
      d: "They're close, but want one more look before signing. Counted as its own extra meeting, with the reason.",
      kid: "They want one more look before they sign.",
      feat: ["Added to the cadence", "Reason saved"],
      hang: [["lead", "Wants one more look"], ["rep", "Books it"], ["data", "Counted separately"]],
      boxes: [box("Advisor does", [["rep", "Books it now or sends the meeting link"], ["rep", "Picks the reason"]]),
        box("Measured", [["data", "Meetings it takes to reach the signature"], ["data", "Where extra meetings stop paying off"]])] },
    { id: "form3", z: "prop", t: "Form 3 · " + f3.t, small: "Form 3", tag: ["plan", "Planned"] as [string, string],
      d: "They review and sign everything online while the advisor is still on the call. Every document delivery is time-stamped" + (inv(n) ? ", which is exactly the record an examiner asks for." : ", so there's a record if anyone asks later."),
      kid: "They sign everything online while you're still on the call.",
      feat: ["E-sign", "Delivery record", "Stall alert"],
      hang: [["lead", "Reviews and signs online"], ["robot", "Documents delivered + time-stamped"], ["robot", "Opened but not finished? Advisor alerted"]],
      boxes: [box("Delivered and signed", f3.l.map((x): [Who, string] => ["lead", x])),
        box("Automatic", [["robot", "Time-stamped record of every document delivered"], ["robot", "Opened but not finished after 15 minutes: advisor alerted"]]),
        box("Saved", [["data", "Signed documents and the delivery record"]]),
        box("Measured", [["data", "Share of proposals signed"], ["data", "Days from proposal to signature"]])] },
    inv(n)
      ? { id: "fund", z: "prop", t: "Accounts opened and funded", small: "After signing", tag: ["plan", "Planned"] as [string, string],
          d: "After signing, accounts open at the custodian and assets transfer in. A lot of advisor deals fall apart right here, so the app tracks every account until it's funded.",
          kid: "Their money moves over to you. That's when it really counts.",
          feat: ["Account opened", "Transfer started", "Funded"],
          hang: [["rep", "Accounts opened"], ["robot", "Transfer stalls? Alert"], ["data", "Funded date saved"]],
          boxes: [box("Stages", [["rep", "Accounts opened at the custodian"], ["rep", "Transfer started"], ["data", "Funded: the first fee is earned"]]),
            box("Automatic", [["robot", "A transfer that stalls gets flagged to the advisor"]]),
            box("Measured", [["data", "Days from signing to funded"], ["data", "Share of signed clients who fund"]])] }
      : { id: "fund", z: "prop", t: "Underwriting to placed policy", small: "After signing", tag: ["plan", "Planned"] as [string, string],
          d: "After the application, the carrier underwrites (sometimes with a medical exam), approves and issues. The policy only counts once it's delivered and the first premium is paid.",
          kid: "The insurance company checks everything and says yes. The policy starts once the first payment is made.",
          feat: ["Underwriting", "Issued", "Placed"],
          hang: [["rep", "Underwriting"], ["robot", "Stalls? Alert"], ["data", "Placed date saved"]],
          boxes: [box("Stages", [["rep", "Underwriting, plus a medical exam if needed"], ["rep", "Approved and issued"], ["data", "Delivered and first premium paid: placed"]]),
            box("Automatic", [["robot", "An application that stalls gets flagged to the advisor"]]),
            box("Measured", [["data", "Days from application to placed"], ["data", "Share of applications that place"], ["data", "Policies issued but not taken"]])] },
    { id: "won", z: "won", end: true, t: WON(n) + " · Client", small: "Won",
      d: "They're a client. The app counts it, credits the source that produced it, and learns what worked.",
      kid: "They're your client now. The app counts it and learns what worked.",
      feat: [inv(n) ? "Assets won" : "Premium placed", "Credited to its source", "Onboarding starts"],
      hang: [["data", inv(n) ? "Assets won counted" : "Premium placed counted"], ["admin", "Owner sees it by advisor + source"], ["robot", "Onboarding starts"]],
      boxes: [box("Firm owner sees", [["admin", (inv(n) ? "Assets won" : "Premium placed") + " by advisor and by source"], ["admin", "Close rate and meetings to close"], ["admin", "Where deals stall and the top objections"]]),
        box("Automatic", [["robot", "Client onboarding begins"], ["robot", "AI Insights suggests what to fix next"]]),
        box("Saved", [["data", "The full history, from the first booking to " + WON(n).toLowerCase()]])] },
  ];
};

export function stationsFor(n: Niche, p: PkgKey): Station[] {
  if (p === "growth") return S2(n, true);
  if (p === "cc") return S3(n, false);
  return [...S1(n), ...S2(n, false), ...S3(n, true)];
}

export const CLOCK = (n: Niche, p: PkgKey): [Who, string, string][] => {
  const c: [Who, string, string][] = [];
  if (p !== "cc") c.push(["nl", "Every week", "Ad budget moved toward the campaigns that book meetings."]);
  c.push(["robot", "The moment they book", "Video link, calendar invite and confirmations to both sides."]);
  c.push(["robot", "24h · 3h · 15m before", "Reminders to the prospect and the advisor. Texts only with consent."]);
  if (p !== "growth") {
    c.push(["robot", "Every 5 minutes", "Speed alerts: a prospect started booking but didn't finish, or opened the signing page and stopped."]);
    c.push(["robot", "When a meeting ends", "The outcome is due. Not logged? It shows as overdue to the advisor and the firm owner."]);
    c.push(["robot", "Every hour", "Missed-meeting clock: a reminder to the advisor before 72 hours, then the follow-up lane."]);
    c.push(["robot", "Every day", "Proposals that went quiet too long are closed out as 'went silent', so close rates stay honest."]);
    c.push(["robot", "On the follow-up date", "'Not now' prospects come back to the advisor at the right time."]);
    c.push(["robot", "Every day (planned)", (inv(n) ? "Transfers" : "Applications") + " that stall get flagged."]);
    c.push(["robot", "Every week", "AI Insights: what changed, where deals are stalling, what to fix next."]);
  }
  return c;
};

