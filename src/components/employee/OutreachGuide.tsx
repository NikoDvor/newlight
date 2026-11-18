import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SCHEDULE_HELP, type PhoneType } from "@/lib/outreach";

/**
 * Click-by-click walkthrough for the Text & LinkedIn module. Written for someone who has never seen it.
 * Every line is tagged: ✋ (the rep does it) or 🤖 (the app does it). "Advanced" shows the technical detail.
 */
export const GUIDE = { big: 0, phone: 1, pull: 2, card: 3, text: 4, schedule: 5, landline: 6, liConnect: 7, liMessage: 8, import: 9, limits: 10, outcome: 11, book: 12, home: 13, textFlow: 14, liFlow: 15, liButtons: 16, second: 17 } as const;

interface Line { t: string; m: boolean; h?: boolean; p?: boolean }
interface Step { title: string; app: string; lines: Line[]; remember?: string; adv?: string[]; flow?: boolean; restart?: boolean; list?: boolean; links?: { label: string; to: string }[] }

const M = (t: string): Line => ({ t, m: true });
const A = (t: string): Line => ({ t, m: false });
const H = (t: string): Line => ({ t, m: true, h: true });
const P = (t: string): Line => ({ t, m: true, p: true });

function steps(phone: PhoneType): Step[] {
  const sched = SCHEDULE_HELP[phone];
  return [
    {
      title: "How this page works",
      flow: true,
      restart: true,
      app: "This page helps you text and LinkedIn-message advisors. You send every message yourself from your own phone and LinkedIn. The app gets everything ready, keeps count, and tracks what works. Nothing here is a robot.",
      lines: [
        H("From start to finish"),
        M("Pull a list of people."),
        A("App picks the right people and skips anyone who said stop."),
        A("App writes the message with their name filled in."),
        M("Tap Text (or Copy + open profile on LinkedIn)."),
        A("App opens Messages or LinkedIn and copies the message."),
        M("Press send in Messages or LinkedIn."),
        M("Tap Sent in the app so it knows."),
        A("App checks the time window (8am to 8pm where they live) and your daily limit, counts it, and moves the card to the next list."),
        M("When someone writes back, tap what happened."),
        A("App updates your numbers and shows which message gets the most replies and meetings."),
        M("If they want a meeting, tap Book."),
        A("App puts them in your pipeline."),
        A("Every Monday and Wednesday, App reminds you to schedule your texts."),
        H("What the app can't do"),
        P("It can't send a message for you."),
        P("It can't see when someone replies, so you log it."),
        P("It can't see when someone accepts you on LinkedIn, so you tap Accepted."),
        P("It can't schedule LinkedIn. You schedule texts on your own phone."),
      ],
      remember: "If you don't tap the buttons, the app has no idea what you did. Your numbers will be wrong.",
      adv: [
        "Nothing here is a bot. There is no shared number and no SMS service. Every send is a human tap in the phone's own Messages app or in LinkedIn.",
        "The app writes to three tables: nl_text_leads (one row per person per rep), nl_text_sends (one row per send, with the template used) and nl_text_templates.",
        "Everything the app does is done by database functions that check you are a signed-in rep before they run.",
        "Use Next to go step by step, or the dots at the bottom to jump. Text: every step in order and LinkedIn: every step in order show the whole journey in one list.",
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
      title: "Text: step by step",
      flow: true,
      list: true,
      app: "Texting is simple: the app gets the text ready, you send it from your phone, then you tell the app what happened.",
      lines: [
        H("Your weekly rhythm"),
        M("Monday by 7:30am: schedule your Monday, Tuesday and Wednesday texts."),
        M("Wednesday by 7:30am: schedule your Thursday and Friday texts."),
        M("Every day: check replies and log what happened."),
        A("The app reminds you on your home page until you have planned enough."),
        H("1. Get your people"),
        M("Tap Text. Tap Get more leads & settings. Type 40. Tap Pull leads."),
        A("The app picks 40 people with phone numbers and skips anyone who said stop, was already picked, or is Won or Lost."),
        A("Each person becomes a card with a message ready."),
        H("2. Pick the message"),
        M("Tap a letter, A to H. The message appears with their name in it."),
        A("Each letter shows how many were sent and what percent replied. A ★ marks the best one."),
        M("Change any words you want."),
        H("3. Send it now"),
        M("Tap Text."),
        A("Messages opens with the number and message ready."),
        M("Tap the send arrow in Messages. Come back and tap Sent."),
        A("The app counts it and moves the card to Awaiting reply."),
        H("4. Or send it later"),
        M("Tap Text. In Messages, schedule it (Send Later on iPhone iOS 18+, or hold the send arrow in Google Messages). Pick a time."),
        A("The app suggests times: 9 to 11:30 and 1 to 3:30 where they live."),
        M("Back in the app, pick the same time and tap Scheduled."),
        A("The card moves to Scheduled, then to Awaiting reply when the time passes."),
        H("5. If it doesn't work"),
        M("Tap Landline."),
        A("The app removes it and counts it toward nothing."),
        H("6. When someone replies"),
        M("Read the reply in Messages and answer it there."),
        M("In the app, open Awaiting reply and tap Log outcome."),
        A("The app updates your numbers. If you pick Stop, that number never gets a message again."),
        M("Need help with your answer? Tap Second message guide."),
        H("7. Book it"),
        M("Tap Book and fill in the first form."),
        A("The app puts them in your pipeline."),
      ],
      adv: [
        "Limits: 40 texts a day (25 on Android), one text per firm per day, 8am to 8pm where the lead lives. The app blocks anything outside these.",
        "Pull: nl_text_pull('text'). Send: nl_text_send. Outcome: nl_text_outcome. Book: nl_text_book.",
        "Scheduling lives on the phone. The app only stores the time you picked so it can count and remind you.",
        "Won or Lost anywhere removes the firm from every other rep's list. Reply and booked rates come only from outcomes reps log.",
      ],
    },
    {
      title: "LinkedIn: step by step",
      flow: true,
      list: true,
      app: "LinkedIn has two steps. First you ask to connect. After they say yes, you message them. Do it once a day, Monday to Friday, in this order. It takes about an hour.",
      lines: [
        H("1. Check who said yes (5 minutes)"),
        M("On LinkedIn, tap My Network, then Manage my network, then Connections. The newest people are at the top."),
        M("In our app, tap LinkedIn, then Requested. Tap Accepted on each person who said yes."),
        A("The app moves them to To message. It can't see accepts, so this tap is how it knows."),
        H("2. Send your messages (up to 40)"),
        M("Open To message. On a card, tap a letter, A to H, to pick the message."),
        M("Tap Copy + open profile."),
        A("The app copies the message and opens their LinkedIn profile."),
        M("On LinkedIn, tap Message, paste, and send."),
        M("Back in the app, tap Message sent."),
        A("The app counts it and moves them to Awaiting reply."),
        H("3. Send your invitations (20)"),
        M("Open To connect. On a card, tap Copy + open profile."),
        A("The app copies the short note and opens their profile."),
        M("On LinkedIn, tap Connect, then Add a note, paste, and tap Send."),
        M("Back in the app, tap Request sent."),
        A("The app counts it and moves them to Requested."),
        H("4. Check replies (5 minutes)"),
        M("On LinkedIn, tap Messaging. Read the replies and answer them there."),
        M("In the app, open Awaiting reply and tap Log outcome."),
        A("The app updates your numbers. If someone wants a meeting, tap Book."),
        H("Once a week"),
        M("Monday: pull about 100 LinkedIn leads for the week (20 a day)."),
        M("Friday: on LinkedIn tap My Network, Invitations, then Sent. Withdraw invitations older than 3 weeks."),
      ],
      adv: [
        "Pull: nl_text_pull('linkedin'). Invitations and messages are separate sends (cap 20 and 40 a day). The app has no LinkedIn connection and can't send, schedule, or see accepts and replies.",
        "LinkedIn limits invitations to about 100 a week. Too many ignored invitations can restrict the account, so spread them out and don't send all 20 in one minute.",
        "Import: tap Import LinkedIn leads to bring in a CSV. It is read in the browser and deduped on the LinkedIn URL. Up to 500 rows at a time.",
      ],
    },
    {
      title: "LinkedIn: the 3 buttons",
      flow: true,
      list: true,
      app: "LinkedIn has three buttons that look alike but do different things. Two are part of our system. One is optional.",
      lines: [
        H("Connect: the invitation (20 a day)"),
        P("Where: the blue Connect button at the top of their profile. If you don't see it, tap the three dots (...) and look for Connect."),
        M("Tap Connect, then Add a note, paste, and tap Send."),
        M("In our app, tap Request sent."),
        P("Limit: about 100 a week on LinkedIn, so 20 a day."),
        H("Message: after they accept (40 a day)"),
        P("Where: the Message button on their profile. Only use it after they accepted."),
        P("If LinkedIn mentions credits or InMail, stop. They have not accepted yet, and InMail uses up limited credits."),
        M("Tap Message, paste, and send."),
        M("In our app, tap Message sent."),
        H("Follow: optional warm-up"),
        P("Where: + Follow under Activity on their profile."),
        P("It sends no message and our app doesn't track it. Keep it to about 10 to 20 a day, spread out."),
        H("Where to check progress on LinkedIn"),
        P("Invitations you sent: My Network, then Invitations, then the Sent tab."),
        P("People who said yes: My Network, then Manage my network, then Connections."),
      ],
      adv: ["Connect gets you a two-way link once they accept. Follow is one-way and lets you see their posts but not message them. Invitations are the request that becomes a connection."],
    },
    {
      title: "Second message: your reply",
      flow: true,
      list: true,
      app: "The first message is a template. Your second message, the reply after they answer, can't have a complete guide, because every reply is different. Use the BDR Script as inspiration, not word for word.",
      links: [
        { label: "Open the BDR Script", to: "/employee/training/m/6/c/2" },
        { label: "Open Objection Handling", to: "/employee/training/m/7" },
      ],
      lines: [
        H("How to look at it"),
        P("You are the front desk, not the doctor."),
        P("When someone walks into a doctor's office, the front desk person does not pretend to be the doctor. They don't diagnose or explain the treatment. They welcome the person and set up the appointment with the doctor."),
        P("You do the same. You are not here to explain everything, sell, or answer every question. Your job is to guide them to the owner and set up the meeting for them. The owner is the doctor."),
        H("What to do"),
        M("Read their reply and answer it in one or two sentences."),
        M("Open the BDR Script for ideas on how to get them to say yes to a meeting. Take the idea, then say it your own way."),
        M("If they push back, open the matching chapter in Objection Handling."),
        M("Offer a time for a meeting with the owner, like \"Would tomorrow or Thursday work?\""),
        M("When they agree, tap Book in the app."),
        H("What not to do"),
        P("Don't copy the call script into a text word for word. It is too long."),
        P("Don't go deep on pricing or how it all works. Say the owner will cover it on the call."),
        H("What the app does"),
        A("Nothing for this step. The app can't write your second message. It keeps track once you log the outcome and tap Book."),
      ],
      adv: ["Training links: Module 6 (The Sales System), chapter 2 is the BDR Script. Module 7 is Objection Handling. The text and LinkedIn replies are not tracked by template, only the outcome you log."],
    },
  ];
}

export function OutreachGuide({ open, onOpenChange, startAt = 0, phoneType }: { open: boolean; onOpenChange: (o: boolean) => void; startAt?: number; phoneType: PhoneType }) {
  const [i, setI] = useState(startAt);
  const [adv, setAdv] = useState(false);
  useEffect(() => { if (open) { setI(startAt); setAdv(false); } }, [open, startAt]);
  const all = steps(phoneType);
  const s = all[Math.min(i, all.length - 1)];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[640px] overflow-y-auto">
        <DialogHeader>
          <DialogDescription className="font-mono text-[11px] uppercase tracking-[0.12em]">Step {i + 1} of {all.length}</DialogDescription>
          <DialogTitle className="text-xl">{s.title}</DialogTitle>
        </DialogHeader>
        <p className="text-[14.5px] leading-relaxed">{s.app}</p>
        <div className="rounded-xl border border-white/[0.14] bg-white/[0.04] p-3">
          <div className="mb-2 text-[13px] font-semibold">🤖 = the app does it · ✋ = the rep does it</div>
          <ul className="grid gap-1.5 text-[14px] leading-snug">
            {s.lines.map((l, k) => l.h
              ? <li key={k} className="mt-3 text-[15px] font-bold first:mt-0">{l.t}</li>
              : <li key={k} className="flex items-start gap-2"><span className="shrink-0">{l.p ? "•" : l.m ? "✋" : "🤖"}</span><span>{l.t}</span></li>)}
          </ul>
        </div>
        {s.links && (
          <div className="flex flex-wrap gap-2">
            {s.links.map((x) => <Link key={x.to} to={x.to} onClick={() => onOpenChange(false)} className="inline-flex min-h-[34px] items-center rounded-lg border border-[hsl(211,96%,56%)] bg-[hsla(211,96%,56%,.18)] px-3 text-[13px] font-semibold">{x.label}</Link>)}
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
