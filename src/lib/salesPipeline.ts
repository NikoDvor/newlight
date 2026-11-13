/**
 * Pipeline Guide content (Training Center → Pipeline Guide) — NewLight's own sales pipeline, by role.
 * BDR = leads → Dialer → books the first meeting (Form 1). SDR = Discovery → Form 2 → Closing → Pay & Sign.
 * Same layout as the Client Showcase: belt → stops with "Say it simply" + "Full details".
 * Who codes: rep = you, partner = the other role, lead = prospect/client, admin = NewLight admin, robot = automatic, data = saved.
 * Keep in step with: claude/meeting-outcomes-system.md, claude/lead-pool-plan.md, claude/contractor-reps-and-payouts.md.
 */
export type SalesRole = "bdr" | "sdr" | "both";
export type GWho = "rep" | "partner" | "lead" | "admin" | "robot" | "data" | "";
export interface GBox { h: string; items: [GWho, string][] }
export interface GStop {
  id: string; z: string; t: string; small: string; d: string; kid: string; feat: string[];
  hang: [GWho, string][]; boxes: GBox[]; tag?: [string, string]; results?: boolean; end?: boolean; who: ("bdr" | "sdr")[];
}

export const ROLES: { k: SalesRole; l: string; d: string }[] = [
  { k: "bdr", l: "BDR", d: "You find the firms, call them, and book the first meeting." },
  { k: "sdr", l: "SDR", d: "You run the meetings, build the price, and close the client." },
  { k: "both", l: "Both", d: "You do the whole thing, from first call to signed client." },
];

/** Zone colors (keys resolved to real colors on the page). */
export const GZONES: Record<string, { l: string; c: string }> = {
  start: { l: "Getting started", c: "violet" },
  ready: { l: "Ready to sell", c: "won" },
  leads: { l: "Leads", c: "cold" },
  calls: { l: "Calling", c: "cold" },
  booked: { l: "Booked · Warm", c: "warm" },
  meet: { l: "Meetings · Warm", c: "warm" },
  close: { l: "Closing · Hot", c: "hot" },
  won: { l: "Won", c: "won" },
};

const b = (h: string, items: [GWho, string][]): GBox => ({ h, items });

/* ---------------- Getting started (the salesman's own onboarding) ---------------- */
export const ONBOARDING: GStop[] = [
  { id: "ob-invite", who: ["bdr", "sdr"], z: "start", small: "Day 1", t: "Your invite and login",
    d: "You get an email invite to the NewLight app. You set your password and land on your own salesman portal.",
    kid: "You get an invite, make a password, and you're in.", feat: ["Email invite", "Your own portal"],
    hang: [["admin", "Admin adds you"], ["rep", "You set your password"]],
    boxes: [b("You do", [["rep", "Open the invite email and set a password"], ["rep", "Add the app to your phone's home screen"]]), b("Admin does", [["admin", "Adds you as a contractor and sends the invite"]])] },
  { id: "ob-paper", who: ["bdr", "sdr"], z: "start", small: "Day 1", t: "Paperwork and pay",
    d: "In My Paperwork & Pay you read and sign your contractor agreement and acknowledgments, and send your W-9. You're a 1099 contractor paid on commission only.",
    kid: "You sign your papers so we can pay you.", feat: ["Sign online", "W-9", "Commission only"],
    hang: [["rep", "Sign your documents"], ["rep", "Send your W-9"], ["admin", "Admin countersigns"]],
    boxes: [b("You do", [["rep", "Sign the agreement and acknowledgments in My Paperwork & Pay"], ["rep", "Send your W-9 through the secure request"], ["rep", "Bank details go through Niko's secure upload link, never in chat or the app"]]),
      b("How you're paid", [["", "BDR: 15% of the setup fee when you booked the meeting"], ["", "SDR: 20% of the setup fee when you closed it"], ["", "Paid within 3 business days after the client's payment clears"]]),
      b("Automatic", [["robot", "The Dialer unlocks once your documents are signed"]])] },
  { id: "ob-train", who: ["bdr", "sdr"], z: "start", small: "Week 1", t: "Training Center",
    d: "Ten short modules: who we sell to, what we sell, our offer, sales fundamentals, the script, objections, closing and your Why. Some chapters are marked BDR or SDR.",
    kid: "You learn what we sell and how to talk about it.", feat: ["10 modules", "Quizzes on 5, 7, 8", "Streaks and XP"],
    hang: [["rep", "Swipe through the chapters"], ["rep", "Pass the quizzes"]],
    boxes: [b("You do", [["rep", "Work through Modules 1–9"], ["rep", "Fill in Your Why: your goal, deadline and dream life (private, only you see it)"]]), b("Saved", [["data", "Your progress, streak and quiz scores"]])] },
  { id: "ob-cert", who: ["bdr", "sdr"], z: "start", small: "Week 1", t: "Final certification",
    d: "Module 10 is a test built from the quiz modules. You need 80% to pass, and you can retake it as many times as you need. Then a Zoom with your team leader.",
    kid: "You take a test. When you pass, you meet your team leader.", feat: ["80% to pass", "Unlimited retakes", "Zoom with team leader"],
    hang: [["rep", "Pass with 80%"], ["admin", "Zoom with your team leader"]],
    boxes: [b("You do", [["rep", "Take the final test (unlimited retakes)"], ["rep", "Book the Zoom with your team leader"]])] },
  { id: "ob-bdr-ready", who: ["bdr"], z: "ready", small: "Ready", t: "Your state, your leads", end: true,
    d: "Admin gives you a state. The app picks your cities in order, and from then on 150 new leads land in your Dialer at 6pm Pacific, Sunday to Thursday.",
    kid: "You get a state, and every work night new firms to call show up.", feat: ["State assigned", "150 leads a night", "City by city"],
    hang: [["admin", "Assigns your state"], ["robot", "Leads arrive at 6pm"]],
    boxes: [b("Admin does", [["admin", "Assigns your state on Territories"]]), b("Automatic", [["robot", "Lines up your cities and works them one at a time"], ["robot", "150 leads at 6pm Pacific, Sunday–Thursday"]]), b("You do", [["rep", "Open the Dialer and start calling"]])] },
  { id: "ob-sdr-ready", who: ["sdr"], z: "ready", small: "Ready", t: "Your calendar and Calculator", end: true,
    d: "Your booking links live in Your Forms. Practice the Discovery script and Calculator until you can run it without reading.",
    kid: "Your calendar is ready and you practice the meeting until it feels easy.", feat: ["Booking links", "Calculator practice", "Client Showcase"],
    hang: [["rep", "Check your booking links"], ["rep", "Practice the Calculator"]],
    boxes: [b("You do", [["rep", "Open Your Forms: your Form 1 link and your meeting link"], ["rep", "Practice a full Discovery in Calculator → Practice"], ["rep", "Click through the Client Showcase so you can screen-share it"]])] },
];

/* ---------------- The pipeline ---------------- */
export const PIPELINE: GStop[] = [
  { id: "leads", who: ["bdr"], z: "leads", small: "6pm", t: "New leads arrive",
    d: "Every work night at 6pm Pacific, the app hands you up to 150 financial firms from your cities. They land in Dialer lists named by city, like \"Irvine, CA\".",
    kid: "Every work night, new firms to call show up in your Dialer.", feat: ["200 a night", "City lists", "Pull more anytime"],
    hang: [["robot", "150 leads at 6pm"], ["robot", "Best firms first"], ["rep", "Pull more if you run out"]],
    boxes: [b("Automatic", [["robot", "Sunday–Thursday at 6pm Pacific"], ["robot", "Firms with a buying sign first, then firms you haven't had, then RIAs"], ["robot", "When a city runs out, it moves to your next city"]]),
      b("You do", [["rep", "Nothing. They're waiting when you open the Dialer"], ["rep", "Out early? Use Pull leads"]]),
      b("Saved", [["data", "Each lead: firm, decision makers, phone numbers, firm type, city"]])] },
  { id: "dial", who: ["bdr"], z: "calls", small: "Dialer", t: "Call",
    d: "Work your lists in the Dialer. Filter by firm type (RIA, Hybrid, Advisor, Insurance), state and city, or search a name or phone number. Every call gets an outcome.",
    kid: "You call firms one after another and write down what happened.", feat: ["Filters", "Search by phone", "Connect rate"],
    hang: [["rep", "Call the firm"], ["rep", "Pick what happened"], ["data", "Connect rate updates"]],
    boxes: [b("You do", [["rep", "Call, get past the front desk, reach the owner"], ["rep", "Pick the call outcome: no answer, gatekeeper, not interested, callback, won and more"]]),
      b("You see", [["rep", "Connect rate and dials per meeting (week, month, all time)"]]),
      b("Saved", [["data", "Every dial and its outcome"], ["data", "Objections you hear"]])] },
  { id: "callback", who: ["bdr"], z: "calls", small: "Not yet", t: "Callbacks and \"no\"",
    d: "Not every call ends in a booking. Schedule a callback and the app pings you when it's due. A \"no\" rests for a while and comes back later to a different salesman.",
    kid: "If they say call me later, the app reminds you. If they say no, they take a break and come back later.", feat: ["Callback alerts", "Rest by reason", "Fresh salesman later"],
    hang: [["rep", "Schedule a callback"], ["robot", "Pings you when it's due"], ["robot", "A \"no\" rests, then returns"]],
    boxes: [b("Automatic", [["robot", "Callback due: text, email and app alert with their number"], ["robot", "Every night: \"no\" leads rest 60 days to a year depending on why"], ["robot", "6+ calls with no real conversation: rests 60 days"], ["robot", "Friday 9pm: imported leads untouched for 10 work days go back to the pool"]])] },
  { id: "form1", who: ["bdr"], z: "booked", small: "Form 1", t: "Book the first meeting",
    d: "While they're still on the phone, send your Form 1 link. They pick a time, the meeting goes on the calendar with a Zoom link, and the lead turns Warm.",
    kid: "While you're on the phone, they pick a time to meet.", feat: ["Book on the call", "Zoom link", "Lead turns Warm"],
    hang: [["rep", "Send your Form 1 link"], ["lead", "They pick a time"], ["robot", "Zoom + confirmations"]],
    boxes: [b("You do", [["rep", "Send the link and stay on until they've booked"]]), b("Lead does", [["lead", "Picks a time and answers a few questions"]]),
      b("Automatic", [["robot", "Zoom link, calendar invite, confirmations to both sides"], ["robot", "Lead moves to Warm"], ["robot", "Started but didn't finish booking: you get a speed alert to call back"]]),
      b("Measured", [["data", "Meetings booked, dials per meeting"]])] },
  { id: "remind", who: ["bdr", "sdr"], z: "booked", small: "Before", t: "Reminders",
    d: "The app reminds both sides 24 hours, 3 hours and 15 minutes before the meeting. Texts go only to people who agreed to get them.",
    kid: "We remind everyone so nobody forgets the meeting.", feat: ["24h · 3h · 15m", "Texts with consent"],
    hang: [["robot", "Reminders 24h · 3h · 15m"]],
    boxes: [b("Automatic", [["robot", "Reminders to you and the prospect"], ["robot", "Skipped for meetings that moved or were cancelled"]])] },
  { id: "handoff", who: ["bdr", "sdr"], z: "booked", small: "Hand-off", t: "BDR hands off to the SDR", tag: ["dec", "To decide"],
    d: "When the BDR and SDR are different people, the booked meeting passes to the SDR, who runs it from here. Today the app keeps the meeting on the BDR's calendar, so the hand-off is done by hand.",
    kid: "The person who booked the meeting passes it to the person who runs it.", feat: ["Notes passed on", "BDR still credited"],
    hang: [["rep", "BDR passes the notes"], ["partner", "SDR takes the meeting"]],
    boxes: [b("BDR does", [["rep", "Passes on what you learned on the call"]]), b("SDR does", [["partner", "Reads the Form 1 answers and the call notes before the meeting"]]),
      b("Credit", [["", "The BDR earns 15% of the setup when the client pays, even though the SDR runs the meetings"]])] },
  { id: "disc", who: ["sdr"], z: "meet", small: "Meeting 1", t: "Discovery", results: true,
    d: "Run the Discovery script with the Calculator: their numbers, their goals, what one new client is worth to them. When the meeting ends, log how it went in two taps.",
    kid: "You meet, learn their numbers, and then tell the app how it went.", feat: ["Calculator", "Two-tap outcome", "Objection saved"],
    hang: [["rep", "Run the Calculator"], ["rep", "Log: showed up? how did it go?"], ["robot", "No outcome? Flagged overdue"]],
    boxes: [b("You do", [["rep", "Open the lead in the Calculator and run the script"], ["rep", "Log attendance and the result: won (moved forward), another meeting first, rescheduled or lost"], ["rep", "Lost: pick the main reason"]]),
      b("Automatic", [["robot", "A meeting with no outcome shows as overdue to you and admin"]]),
      b("Saved", [["data", "Attendance, result, objection, meeting number"]])] },
  { id: "extra1", who: ["sdr"], z: "meet", small: "Extra", t: "Another meeting before Form 2", results: true,
    d: "They came but want one more talk first, often to bring the spouse or partner. Pick a time or send your meeting link. It's counted as its own extra meeting, not a reschedule.",
    kid: "They liked it but want to talk one more time first.", feat: ["Pick a time or send link", "Reason saved"],
    hang: [["rep", "Book it or send the link"], ["data", "Counted as follow-up #1, #2…"]],
    boxes: [b("You do", [["rep", "Pick why: needs the decision maker, more info, wants to think, review numbers, ran out of time"]]), b("Measured", [["data", "Meetings it takes to reach Form 2"]])] },
  { id: "missed", who: ["sdr"], z: "meet", small: "Detour", t: "No-show or reschedule",
    d: "The meeting didn't happen. Send your rebook link or pick a new time. A 72-hour clock starts: no new time by then and the lead goes back to Cold.",
    kid: "They missed it, so they get an easy way to pick a new time.", feat: ["Rebook link", "72-hour clock"],
    hang: [["robot", "Rebook link sent"], ["robot", "Warning at 67h"], ["robot", "Cold at 72h"]],
    boxes: [b("Automatic", [["robot", "Rebook link to the lead (text only with consent)"], ["robot", "Warning at 67 hours, back to Cold at 72"]]), b("Saved", [["data", "Try 2, try 3 of the same meeting"]])] },
  { id: "form2", who: ["sdr"], z: "close", small: "Form 2", t: "Close Prep: package and price",
    d: "Pick the package and price, and book the closing meeting with every decision maker before Discovery ends. The lead turns Hot.",
    kid: "You pick their package and price, and book the next meeting.", feat: ["Package + price", "Meeting 2 booked", "Lead turns Hot"],
    hang: [["rep", "Pick package + price"], ["rep", "Book Meeting 2 on the call"], ["robot", "Lead turns Hot"]],
    boxes: [b("You do", [["rep", "Growth, Command Center or Enterprise; prices start from their average client value"], ["rep", "Book Meeting 2 with every decision maker"]]),
      b("Rules", [["", "More than 15% under the default price needs admin approval"], ["", "Won the Discovery but no Form 2 within 24 hours: \"Expired — No Form 2\""]]),
      b("Automatic", [["robot", "Deal created, Zoom for Meeting 2, emails to both sides, Pay & Sign link ready"]])] },
  { id: "closing", who: ["sdr"], z: "close", small: "Meeting 2", t: "Closing", results: true,
    d: "Walk them through the plan and the price, and close on the call. Won: send Pay & Sign while you're still on with them.",
    kid: "You show them the plan, they say yes, and they sign while you're there.", feat: ["Close on the call", "Client Showcase"],
    hang: [["rep", "Present the plan"], ["lead", "They decide"], ["rep", "Won: send Pay & Sign live"]],
    boxes: [b("You do", [["rep", "Screen-share the Client Showcase if it helps"], ["rep", "Log the outcome"]]), b("Automatic", [["robot", "A Hot deal that goes quiet too long is closed out, so close rates stay honest"]])] },
  { id: "extra2", who: ["sdr"], z: "close", small: "Extra", t: "Another meeting before Pay & Sign", results: true,
    d: "They're close but want one more look. Book it; it's counted as its own extra meeting.",
    kid: "They want one more look before they sign.", feat: ["Counted separately"],
    hang: [["rep", "Book it"], ["data", "Counted separately"]],
    boxes: [b("Measured", [["data", "Meetings it takes to reach Pay & Sign"]])] },
  { id: "form3", who: ["sdr"], z: "close", small: "Form 3", t: "Pay & Sign",
    d: "The client reviews the agreement, pays and signs online. Then they book their onboarding meeting themselves.",
    kid: "They pay and sign online, then pick a time to get started.", feat: ["Pay + sign online", "Speed alert", "Onboarding booked"],
    hang: [["lead", "Pays and signs"], ["robot", "Opened but stopped? You're alerted"], ["lead", "Books onboarding"]],
    boxes: [b("Automatic", [["robot", "Open 15+ minutes without finishing: speed alert to you"], ["robot", "Not done in 7 days: you choose Lost or Still waiting"]]), b("Lead does", [["lead", "Reviews, pays, signs, books the onboarding meeting"]])] },
  { id: "won", who: ["bdr", "sdr"], z: "won", small: "Won", t: "Won client and your pay", end: true,
    d: "The lead turns Won, the client's onboarding starts, and your commission is recorded once their payment clears.",
    kid: "They're a client now, and you get paid.", feat: ["Lead turns Won", "Onboarding", "Commission"],
    hang: [["robot", "Lead turns Won"], ["admin", "Onboarding starts"], ["data", "Your commission"]],
    boxes: [b("Your pay", [["", "BDR: 15% of the setup fee · SDR: 20% · Both: 35%"], ["", "Paid within 3 business days after the client's money clears"], ["", "Payment plan: half as each payment clears"]]),
      b("Automatic", [["robot", "Client onboarding meeting, account set up"], ["robot", "Close rates and AI Insights update"]])] },
];

const swap = (w: GWho): GWho => (w === "rep" ? "partner" : w === "partner" ? "rep" : w);
export function stopsFor(list: GStop[], role: SalesRole): GStop[] {
  if (role === "both") return list.filter((s) => s.id !== "handoff");
  return list.filter((s) => s.who.includes(role)).map((s) =>
    // The hand-off is written from the BDR's side; for an SDR, "you" and "your BDR" swap.
    role === "sdr" && s.id === "handoff"
      ? { ...s, hang: s.hang.map(([w, t]) => [swap(w), t] as [GWho, string]), boxes: s.boxes.map((bx) => ({ ...bx, items: bx.items.map(([w, t]) => [swap(w), t] as [GWho, string]) })) }
      : s);
}

export const GCLOCK = (role: SalesRole): [GWho, string, string, ("bdr" | "sdr")[]][] => {
  const all: [GWho, string, string, ("bdr" | "sdr")[]][] = [
    ["robot", "6pm Pacific, Sun–Thu", "Up to 150 new leads in your Dialer, from your cities.", ["bdr"]],
    ["robot", "When a callback is due", "Text, email and app alert with the lead's number.", ["bdr"]],
    ["robot", "Every night", "Leads that said no rest for a while, then go to a different salesman.", ["bdr"]],
    ["robot", "Friday 9pm", "Imported leads nobody touched for 10 work days go back to the pool.", ["bdr"]],
    ["robot", "Every 5 minutes", "Speed alerts: started booking but didn't finish, or opened Pay & Sign and stopped.", ["bdr", "sdr"]],
    ["robot", "24h · 3h · 15m before", "Meeting reminders to you and the lead.", ["bdr", "sdr"]],
    ["robot", "When a meeting ends", "Outcome due. Not logged? Shows as overdue to you and admin.", ["sdr"]],
    ["robot", "Every hour", "No-show clock: warning at 67 hours, back to Cold at 72.", ["sdr"]],
    ["robot", "24h after a won Discovery", "No Form 2 yet: \"Expired — No Form 2\".", ["sdr"]],
    ["robot", "Every day", "Hot deals that went quiet too long are closed out.", ["sdr"]],
  ];
  return role === "both" ? all : all.filter((c) => c[3].includes(role));
};
