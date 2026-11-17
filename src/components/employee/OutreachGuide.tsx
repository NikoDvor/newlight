import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SCHEDULE_HELP, type PhoneType } from "@/lib/outreach";

/**
 * Click-by-click walkthrough for the Text & LinkedIn module. Written for someone who has never seen it.
 * Every line is tagged: 🖐️ Manual (you do it) or 🤖 Automated (the app does it). "Advanced" shows the technical detail.
 */
export const GUIDE = { big: 0, phone: 1, pull: 2, card: 3, text: 4, schedule: 5, landline: 6, liConnect: 7, liMessage: 8, import: 9, limits: 10, outcome: 11, book: 12, home: 13, textFlow: 14, liFlow: 15, who: 16 } as const;

interface Line { t: string; m: boolean; h?: boolean }
interface Step { title: string; app: string; lines: Line[]; remember?: string; adv?: string[]; flow?: boolean }

const M = (t: string): Line => ({ t, m: true });
const A = (t: string): Line => ({ t, m: false });
const H = (t: string): Line => ({ t, m: true, h: true });

function steps(phone: PhoneType): Step[] {
  const sched = SCHEDULE_HELP[phone];
  return [
    {
      title: "The big picture",
      app: "This page helps you send texts and LinkedIn messages to advisors. YOU send every message from your own phone and your own LinkedIn. The app gets the message ready, counts what you send, and keeps track of replies.",
      lines: [
        M("You tap Pull leads and say how many you want."),
        A("The app picks the people for you."),
        A("The app writes the message with their name already in it."),
        M("You tap Text (or Copy + open profile on LinkedIn)."),
        M("You press send in Messages or LinkedIn."),
        M("You tap Sent in the app (or Request sent / Message sent)."),
        A("The app counts it and moves the card to the next list."),
        M("When someone writes back, you tap what happened."),
        A("The app updates your numbers, the team numbers and the message's win rate."),
        M("If they want a meeting, you tap Book."),
        A("The app puts them in your pipeline."),
      ],
      remember: "The app never sends anything for you, and it can't see replies. If you don't tap the buttons, the app has no idea what you did.",
      adv: [
        "Nothing here is a bot. There is no shared number and no SMS service. Every send is a human tap in the phone's own Messages app or in LinkedIn.",
        "The app writes to three tables: nl_text_leads (one row per person per rep), nl_text_sends (one row per send, with the template used) and nl_text_templates.",
        "Everything the app does is done by database functions that check you are a signed-in rep before they run.",
      ],
    },
    {
      title: "Pick your phone",
      app: "Different phones can do different things. The app uses your answer to set your daily limit and show you the right steps.",
      lines: [
        M("Open Get more leads & settings near the top of the page."),
        M("Tap the box that says My phone."),
        M("Pick the one that matches your phone: iPhone with iOS 18 or newer, older iPhone, Android with Google Messages, or other Android."),
        A("The app saves your answer by itself."),
        A("The app sets your daily text limit (40 on iPhone, 25 on Android) and shows the right scheduling steps."),
      ],
      remember: "Not sure about your iPhone? Open Settings, tap General, tap About, and look at iOS Version. 18 or higher is the new one.",
      adv: [
        "Saved in nl_text_settings (phone_type). iPhones link with sms:+1…&body= and Androids with sms:+1…?body=.",
        "Scheduling is offered only for iOS 18+ (Send Later) and Android with Google Messages.",
      ],
    },
    {
      title: "Pull your leads",
      app: "Pulling gives you people to message. The app picks the owner of each firm when it can, skips anyone who already said stop, and never gives the same person to two reps.",
      lines: [
        M("Open Get more leads & settings."),
        M("Type how many you want in the number box. 40 is a normal day."),
        M("Leave State empty for any state, or type two letters like CA."),
        M("Tap Pull leads."),
        A("The app picks one person per firm, the owner first, in list order."),
        A("On Text it only picks people with a phone number. On LinkedIn it only picks people with a LinkedIn link."),
        A("The app skips Stop numbers, people already pulled, and firms that are Won or Lost."),
        A("A message pops up with how many were added, and the cards show up in To text (or To connect)."),
      ],
      remember: "A lead you pull is yours for texting only. If it is also on someone's Dialer list, you can still text it and they can still call it. When a lead is Won or Lost (in the Dialer or by text), it leaves everyone else's lists.",
      adv: [
        "Function: nl_text_pull(_count, _state, _channel). Max 150 per pull. Source: shared lead pool (nl_lead_pool_firms + nl_lead_pool_contacts).",
        "One contact per firm (owner first, then rank). Skips do_not_call, nl_dnc_numbers, a firm with an unsent text lead or a text sent today, and firms closed Won/Lost in the Dialer or by text.",
        "A text pull and a LinkedIn pull are separate. A contact with both a phone and a LinkedIn link can show on both sides.",
      ],
    },
    {
      title: "Read a lead card",
      app: "Each person is a card. It shows what you need and the message ready to send.",
      lines: [
        A("The card shows the firm, the person's name, their city and how big the firm is."),
        A("The app picks a starting message and fills in their first name, the firm and your name."),
        M("Tap the small template box if you want a different message."),
        M("Tap in the big box and change any words you want."),
        M("Changed your mind? Tap Reset to template."),
      ],
      remember: "Read the message before you send it. If a name looks wrong or says \"there\", fix it.",
      adv: [
        "Placeholders: {first}, {rep}, {firm}, {city}. If the first name is missing or looks wrong, {first} falls back to \"there\".",
        "Edits stay on your screen only. The template saved in the system is unchanged, and the stats count the template you started from.",
      ],
    },
    {
      title: "Send a text",
      app: "The Text button opens your Messages app with the text already typed. It does not send it.",
      lines: [
        M("On the card, tap the blue Text button."),
        A("Your Messages app opens with the number and the message filled in, and the message is copied too."),
        M("Look at it, then tap the send arrow in Messages."),
        M("Go back to this app and tap Sent."),
        A("The app counts it toward your daily number and moves the card to Awaiting reply."),
        A("The app blocks the send if it is outside 8am to 8pm where the person lives, or if you hit your daily limit."),
      ],
      remember: "If Messages opens with an empty box, tap Copy on the card, then paste into the box. Texting only works well from your phone, not a computer.",
      adv: [
        "Function: nl_text_send(_id, _channel, _when, _template, _body). Writes an nl_text_sends row with the exact wording sent and the template id.",
        "Limits are checked in the database, not just on screen: 40 texts/day (25 Android), one text per firm per day, 8am to 8pm in the lead's timezone (from the lead's state).",
        "The app cannot confirm the message was really sent. It trusts your tap.",
      ],
    },
    {
      title: sched.title,
      app: "You can have your phone send the text later. Plan 3 days at a time. Schedule Monday to Wednesday by Monday at 7:30am, so do it Sunday or early Monday. Schedule Thursday and Friday by Wednesday at 7:30am. You can do it Tuesday or early Wednesday.",
      lines: [
        ...sched.steps.map((s) => M(s)),
        A("The app suggests send times: Monday to Friday, 9 to 11:30 and 1 to 3:30 where the person lives, about 6 minutes apart."),
        A("The app counts it under Texts scheduled and moves the card to Scheduled. When the time passes it moves to Awaiting reply by itself."),
        A("Your home page shows a yellow reminder until you have planned enough."),
      ],
      remember: sched.note,
      adv: [
        "The phone does the scheduling. The app only records the time you picked (text_sent_at in the future) so it can count and remind you.",
        "No bulk scheduling. Each text is scheduled one at a time on purpose.",
        "Reminder deadlines are in Pacific time: Mon to Wed texts by Monday 7:30am, Thu to Fri texts by Wednesday 7:30am.",
      ],
    },
    {
      title: "If the number doesn't work",
      app: "Some numbers are landlines or old numbers, and they can't get texts. The Landline button takes the lead out without hurting your numbers.",
      lines: [
        M("A text says Not Delivered, or you know it's an office line."),
        M("On the card, tap Landline."),
        A("The lead moves to the Done list."),
        A("The app does not count it toward your daily texts or any stats."),
      ],
      remember: "You can use Landline even after you tapped Sent. It removes that send.",
      adv: ["Marks the lead result = landline and removes its nl_text_sends row, so no stat counts it. The lead can still be called in the Dialer."],
    },
    {
      title: "LinkedIn, part 1: ask to connect",
      app: "On LinkedIn you usually have to be connected before you can message someone. So the first step is a connection request with a short note.",
      lines: [
        M("Tap the LinkedIn button near the top of the page."),
        M("Open Get more leads & settings and tap Pull leads."),
        A("The app picks people who have a LinkedIn link."),
        M("On a card in To connect, tap Copy + open profile."),
        A("The app copies the note and opens their LinkedIn profile."),
        M("On LinkedIn, tap Connect, then Add a note, then paste."),
        M("Tap Send on LinkedIn."),
        M("Go back to this app and tap Request sent."),
        A("The app counts it (goal 20 a day) and moves the card to Requested."),
      ],
      remember: "LinkedIn can't be scheduled. Send it the same day.",
      adv: [
        "LinkedIn is two sends: li_connect (request, cap 20/day) and li_message (message, cap 40/day). Each is its own nl_text_sends row.",
        "The app has no LinkedIn connection. It cannot see, send or schedule anything on LinkedIn.",
      ],
    },
    {
      title: "LinkedIn, part 2: message them",
      app: "Once they accept, you can send them a real message. The app can't see when they accept, so you check LinkedIn yourself.",
      lines: [
        M("Open LinkedIn and look at your notifications or My Network for accepted requests."),
        M("In this app, open the Requested list."),
        M("Find that person and tap Accepted."),
        A("The app moves them to To message."),
        M("Tap Copy + open profile, then tap Message on LinkedIn, paste, and send."),
        M("Back in the app, tap Message sent."),
        A("The app counts it (goal 40 a day) and moves them to Awaiting reply."),
      ],
      remember: "Don't tap Accepted until they really did. You can undo it with Undo send.",
      adv: ["li_status moves new → requested → accepted → sent. Accepted is a rep tap, so the app does not know the accept time. Reply rate is measured from your logged outcomes."],
    },
    {
      title: "Import LinkedIn leads",
      app: "Got a spreadsheet of LinkedIn profiles from lead research? Bring it in and the app turns each row into a card.",
      lines: [
        M("Tap the LinkedIn button, open Get more leads & settings, then tap Import LinkedIn leads."),
        M("Tap Download example if you want to see the right columns."),
        M("Tap Choose file and pick your CSV file."),
        A("The app reads the file and shows a preview with how many rows it found."),
        M("Tap Import."),
        A("The app adds the cards and skips repeats and bad links."),
        A("A message tells you how many were added, how many were already in the system, and how many had a bad link."),
      ],
      remember: "The columns are: first_name, last_name, firm, linkedin_url, phone, city, state. Only linkedin_url is required. Up to 500 rows at a time.",
      adv: ["Parsed in the browser (header names are flexible, e.g. company = firm). Rows are inserted by function and deduped on the LinkedIn URL."],
    },
    {
      title: "Daily goals and limits",
      app: "The numbers at the top show how many you sent today. When the bar is full, you hit your goal and get a check mark.",
      lines: [
        A("The app shows texts sent, LinkedIn requests, LinkedIn messages and texts scheduled."),
        A("Each shows a number like 12 / 40. That means 12 done, goal is 40."),
        A("The bar fills up and turns green when you hit it."),
        A("The app won't let you go past your limit for the day."),
      ],
      remember: "Texts: 40 a day on iPhone, 25 on Android. LinkedIn: 20 requests and 40 messages. Only send from 8am to 8pm where the person lives. One text per firm per day.",
      adv: ["Days roll over at midnight Pacific. Counts come from nl_text_sends. Scheduled texts count toward the future day they are set for."],
    },
    {
      title: "When someone replies",
      app: "Replies show up in your own Messages or LinkedIn, not in this app. You answer them there. Then you tell the app what happened.",
      lines: [
        M("Read the reply in Messages or LinkedIn and answer it there."),
        M("In this app, open Awaiting reply and find that person."),
        M("Tap the Log outcome box and pick what happened, like Need to Think, Not Interested or Said They Would Reach Out."),
        A("The app saves it and updates your numbers and the win rate for the message you used."),
        M("If they asked you to stop, pick Stop."),
        A("The app puts their number on the Do Not Call list. They never get another message from anyone."),
        M("No answer after a few days? Pick No Reply."),
      ],
      remember: "These are the same outcomes as the Dialer, plus No Reply, Wrong Number and Stop. If you skip this step, your numbers will be wrong.",
      adv: [
        "Function: nl_text_outcome. Text outcomes are stored apart from Dialer call outcomes, so a Dialer Lost never changes a text stat and the other way around.",
        "Won or Lost also closes the firm everywhere: it leaves other reps' Dialer lists and the text pool (closed_out_at).",
        "Per-template stats (sends, replies, outcomes, win rate) are built from these taps on the admin Text & LinkedIn page.",
      ],
    },
    {
      title: "Book the meeting",
      app: "When someone wants to talk, one tap sends them into your pipeline.",
      lines: [
        A("After you log a good reply, a blue Book button shows on the card."),
        M("Tap Book."),
        M("Fill in the first form like you do for a call."),
        A("The app creates the lead in your pipeline. If that firm was already in your Dialer, it uses that same lead."),
        A("The normal pipeline takes over from here."),
      ],
      remember: "Booking is the only time a text or LinkedIn lead leaves this page. From there it works like any lead you booked from a call.",
      adv: ["Function: nl_text_book reuses an existing nl_bdr_leads row by pool_firm_id when you already have it, otherwise creates one."],
    },
    {
      title: "Your home page",
      app: "Your home page shows how today is going, so you don't have to open this page to check.",
      lines: [
        M("Open the home page when you log in."),
        A("The Text & LinkedIn today box shows each goal and how many are left. A green check means you hit it."),
        A("On Sunday and Monday a yellow reminder says to schedule Monday to Wednesday texts by Monday 7:30am. From Tuesday on it says to schedule Thursday and Friday texts by Wednesday 7:30am. It says Overdue if the time passed."),
        A("The reminder goes away when you've planned enough."),
        M("Tap Open outreach to jump back here."),
      ],
      adv: ["The reminder is only on screen. There are no phone push notifications yet."],
    },
    {
      title: "Text: every step in order",
      flow: true,
      app: "This is the whole text journey from the first tap to the booked meeting, in the order it happens.",
      lines: [
        H("Set up (one time)"),
        M("Pick your phone type under Get more leads & settings."),
        A("The app saves it and sets your daily limit (40 on iPhone, 25 on Android)."),
        H("Get leads (every day)"),
        M("Open Outreach and tap the Text button."),
        M("Open Get more leads & settings, type how many (40), leave State empty or type two letters, and tap Pull leads."),
        A("The app picks one person per firm with a phone number, owner first. It skips Stop numbers, repeats and Won or Lost firms."),
        A("The cards appear in To text with the message already filled in."),
        M("Read the card. Pick a different template or change any words if you want."),
        H("Send it now"),
        M("Tap the blue Text button."),
        A("Messages opens with the number and message filled in, and the message is copied."),
        M("Tap the send arrow in Messages."),
        M("Go back and tap Sent."),
        A("The app checks it is 8am to 8pm where they live, you are under your limit, and the firm has not been texted today."),
        A("The app counts it and moves the card to Awaiting reply."),
        H("Or send it later (plan Sunday or Monday, and Tuesday or Wednesday)"),
        M("Tap Text."),
        A("Messages opens with the number and message filled in."),
        M("Schedule it on your phone: Send Later on iPhone iOS 18+, or hold the send arrow in Google Messages. Pick the time and confirm."),
        A("The app suggests send times, 9 to 11:30 and 1 to 3:30 where they live, about 6 minutes apart."),
        M("Back in the app, pick the same time under Schedule and tap Scheduled."),
        A("The app counts it under Texts scheduled and moves the card to Scheduled."),
        A("Your home page shows a yellow reminder until you have planned enough: Monday to Wednesday by Monday 7:30am, Thursday and Friday by Wednesday 7:30am."),
        A("When the time passes, the card moves to Awaiting reply by itself."),
        H("If the number doesn't work"),
        M("Tap Landline."),
        A("The app removes the send, counts it toward nothing and moves the lead to Done."),
        H("When someone replies"),
        M("Read the reply in Messages and answer it there."),
        M("In the app, open Awaiting reply and tap Log outcome for that person."),
        A("The app saves it and updates your numbers and that message's win rate."),
        A("If you pick Stop, the number goes on Do Not Call for everyone."),
        M("No answer after a few days? Pick No Reply."),
        H("Book it"),
        M("When they want to talk, tap Book and fill in the first form."),
        A("The app creates the lead in your pipeline, or uses your existing Dialer lead."),
        A("If the lead is later Won or Lost, it leaves every other rep's list."),
        H("End of day"),
        A("Your bar turns green when you hit 40 (25 on Android). Everything resets at midnight Pacific."),
      ],
      adv: [
        "Pull: nl_text_pull('text'). Send: nl_text_send. Outcome: nl_text_outcome. Book: nl_text_book. All run in the database as you, after a rep check.",
        "Scheduling lives on the phone. The app only stores the time you picked so it can count and remind you.",
        "The app cannot see replies. Reply rate comes only from the outcomes you log.",
      ],
    },
    {
      title: "LinkedIn: every step in order",
      flow: true,
      app: "This is the whole LinkedIn journey from the first tap to the booked meeting, in the order it happens. LinkedIn cannot be scheduled, so you do all of it the same day.",
      lines: [
        H("Get leads (every day)"),
        M("Open Outreach and tap the LinkedIn button."),
        M("Open Get more leads & settings, type how many, and tap Pull leads. Or tap Import LinkedIn leads and choose your CSV file."),
        A("The app picks one person per firm who has a LinkedIn link. It skips repeats and Won or Lost firms."),
        A("On an import, the app reads the file, shows a preview, adds the cards and skips repeats and bad links."),
        A("The cards appear in To connect with the short note already filled in."),
        H("Step 1: ask to connect (goal 20 a day)"),
        M("On a card, tap Copy + open profile."),
        A("The app copies the note and opens their LinkedIn profile."),
        M("On LinkedIn, tap Connect, then Add a note, then paste, then Send."),
        M("Go back and tap Request sent."),
        A("The app counts it and moves the card to Requested."),
        H("Wait for them to accept"),
        M("Check LinkedIn notifications or My Network for accepted requests."),
        M("In the app, open Requested and tap Accepted for each one."),
        A("The app moves them to To message. It cannot see accepts on its own."),
        H("Step 2: send the message (goal 40 a day)"),
        M("On a To message card, tap Copy + open profile."),
        A("The app copies the message and opens the profile."),
        M("On LinkedIn, tap Message, paste, and send."),
        M("Go back and tap Message sent."),
        A("The app counts it and moves them to Awaiting reply."),
        H("When someone replies"),
        M("Read the reply on LinkedIn and answer it there."),
        M("In the app, open Awaiting reply and tap Log outcome for that person."),
        A("The app saves it and updates your numbers and that message's win rate."),
        M("No answer after a few days? Pick No Reply."),
        H("Book it"),
        M("When they want to talk, tap Book and fill in the first form."),
        A("The app creates the lead in your pipeline."),
        A("If the lead is later Won or Lost, it leaves every other rep's list."),
        H("End of day"),
        A("Your bars turn green at 20 requests and 40 messages. Everything resets at midnight Pacific."),
      ],
      adv: [
        "Pull: nl_text_pull('linkedin'). Requests and messages are separate sends (li_connect cap 20, li_message cap 40).",
        "The app has no LinkedIn connection. It cannot send, schedule, or see accepts and replies. Every LinkedIn status change is a rep tap.",
        "Import is read in the browser and deduped on the LinkedIn URL. Up to 500 rows at a time.",
      ],
    },
    {
      title: "Who does what",
      app: "Here is everything in one place. 🖐️ Manual means you do it. 🤖 Automated means the app does it.",
      lines: [
        M("Pick your phone type."),
        M("Choose how many leads and tap Pull leads."),
        M("Read and edit the message."),
        M("Tap Text or Copy + open profile."),
        M("Press send in Messages or LinkedIn."),
        M("Schedule the text on your phone (iPhone or Google Messages)."),
        M("Tap Sent, Request sent or Message sent."),
        M("Tap Accepted when someone accepts on LinkedIn."),
        M("Tap Landline when a number can't get texts."),
        M("Log what happened when someone replies."),
        M("Tap Book when they want a meeting."),
        A("Picks the people and skips Stop numbers, repeats and closed firms."),
        A("Fills in the name, firm, city and your name."),
        A("Opens Messages or the profile and copies the message."),
        A("Keeps the time window (8am to 8pm where they live) and the daily limits."),
        A("Counts every send and moves the cards between lists."),
        A("Suggests send times and shows the Monday and Wednesday reminders."),
        A("Puts Stop numbers on Do Not Call."),
        A("Removes Won and Lost firms from everyone's lists."),
        A("Builds the numbers: by rep, by message, response rate and win rate."),
        A("When an admin edits or deletes a message, wipes that message's old numbers so the new one starts fresh."),
      ],
      remember: "Things the app can NOT do: send a message for you, see replies, see a LinkedIn accept, or schedule LinkedIn.",
      adv: [
        "Admins edit the 8 templates per channel on the Text & LinkedIn admin page. Editing the wording or deleting resets that template's stats (nl_text_template_save / nl_text_template_delete). Sends stay counted, only the template link is cleared.",
        "Data: nl_text_leads, nl_text_sends, nl_text_templates, nl_text_settings, nl_dnc_numbers. Source pool: nl_lead_pool_firms / nl_lead_pool_contacts.",
        "No bots, no automatic sending, no reply detection. A future upgrade could add reply notifications, but that needs a messaging service and is not built.",
      ],
    },
  ];
}

const badge = (m: boolean) => m
  ? <span className="mr-2 inline-flex shrink-0 items-center gap-1 rounded-full border border-[hsl(38,95%,58%)]/60 bg-[hsla(38,95%,58%,.14)] px-2 py-0.5 text-[11px] font-bold text-[hsl(38,95%,72%)]">🖐️ Manual</span>
  : <span className="mr-2 inline-flex shrink-0 items-center gap-1 rounded-full border border-[hsl(211,96%,62%)]/60 bg-[hsla(211,96%,56%,.16)] px-2 py-0.5 text-[11px] font-bold text-[hsl(211,96%,80%)]">🤖 Automated</span>;

export function OutreachGuide({ open, onOpenChange, startAt = 0, phoneType }: { open: boolean; onOpenChange: (o: boolean) => void; startAt?: number; phoneType: PhoneType }) {
  const [i, setI] = useState(startAt);
  const [adv, setAdv] = useState(false);
  useEffect(() => { if (open) { setI(startAt); setAdv(false); } }, [open, startAt]);
  const all = steps(phoneType);
  const s = all[Math.min(i, all.length - 1)];
  const isWho = i === GUIDE.who;
  const manual = s.lines.filter((l) => l.m), auto = s.lines.filter((l) => !l.m);
  const row = (l: Line, k: number) => <li key={k} className="flex items-start">{badge(l.m)}<span>{l.t}</span></li>;
  let n = 0;
  const flowRow = (l: Line, k: number) => l.h
    ? <li key={k} className="mt-2 border-b border-white/15 pb-1 text-[12.5px] font-bold uppercase tracking-wide text-white/85 first:mt-0">{l.t}</li>
    : <li key={k} className="flex items-start gap-2"><span className="w-6 shrink-0 text-right font-mono text-[12px] text-white/60">{++n}.</span>{badge(l.m)}<span>{l.t}</span></li>;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[640px] overflow-y-auto">
        <DialogHeader>
          <DialogDescription className="font-mono text-[11px] uppercase tracking-[0.12em]">Step {i + 1} of {all.length}</DialogDescription>
          <DialogTitle className="text-xl">{s.title}</DialogTitle>
        </DialogHeader>
        <p className="text-[14.5px] leading-relaxed">{s.app}</p>
        <div className="flex flex-wrap items-center gap-2 text-[12px]">{badge(true)}<span className="opacity-80">you do it</span>{badge(false)}<span className="opacity-80">the app does it</span></div>
        {s.flow ? (
          <div className="rounded-xl border border-white/[0.14] bg-white/[0.04] p-3">
            <ul className="grid gap-2 text-[14px] leading-snug">{s.lines.map((l, k) => flowRow(l, k))}</ul>
          </div>
        ) : isWho ? (
          <div className="grid gap-3">
            <div className="rounded-xl border border-[hsl(38,95%,58%)]/40 bg-[hsla(38,95%,58%,.06)] p-3">
              <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wide">🖐️ Manual: you</div>
              <ul className="grid gap-1.5 text-[14px] leading-snug">{manual.map((l, k) => <li key={k}>• {l.t}</li>)}</ul>
            </div>
            <div className="rounded-xl border border-[hsl(211,96%,62%)]/40 bg-[hsla(211,96%,56%,.07)] p-3">
              <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wide">🤖 Automated: the app</div>
              <ul className="grid gap-1.5 text-[14px] leading-snug">{auto.map((l, k) => <li key={k}>• {l.t}</li>)}</ul>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.14] bg-white/[0.04] p-3">
            <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wide opacity-70">Click by click</div>
            <ul className="grid gap-2 text-[14px] leading-snug">{s.lines.map((l, k) => row(l, k))}</ul>
          </div>
        )}
        {s.remember && <p className="rounded-xl border border-[hsl(38,95%,58%)]/40 bg-[hsla(38,95%,58%,.08)] p-3 text-[13.5px]"><b>Remember: </b>{s.remember}</p>}
        {s.adv && (
          <div>
            <button type="button" onClick={() => setAdv((v) => !v)} aria-expanded={adv}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-white/30 bg-[hsl(220,40%,13%)] px-3 text-[13px] font-semibold hover:bg-[hsl(220,40%,19%)]">
              {adv ? "Hide advanced" : "Advanced"} <span aria-hidden>{adv ? "▴" : "▾"}</span>
            </button>
            {adv && (
              <ul className="mt-2 grid gap-1.5 rounded-xl border border-white/[0.14] bg-black/25 p-3 text-[13px] leading-snug">
                {s.adv.map((a, k) => <li key={k}>• {a}</li>)}
              </ul>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {all.map((x, k) => (
            <button key={k} type="button" onClick={() => setI(k)} aria-label={`Go to step ${k + 1}: ${x.title}`} title={x.title}
              className={"h-2.5 rounded-full " + (k === i ? "w-6 bg-[hsl(211,96%,56%)]" : "w-2.5 bg-white/25 hover:bg-white/45")} />
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <button type="button" disabled={i === 0} onClick={() => setI((n) => n - 1)} className="inline-flex items-center gap-1 rounded-lg border border-white/[0.16] px-3 py-2 text-[13.5px] font-semibold disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Back</button>
          {i < all.length - 1
            ? <button type="button" onClick={() => setI((n) => n + 1)} className="inline-flex items-center gap-1 rounded-lg border border-[hsl(211,96%,56%)] bg-[hsla(211,96%,56%,.18)] px-3 py-2 text-[13.5px] font-semibold">Next<ChevronRight className="h-4 w-4" /></button>
            : <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg border border-[hsl(211,96%,56%)] bg-[hsla(211,96%,56%,.18)] px-3 py-2 text-[13.5px] font-semibold">Done</button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
