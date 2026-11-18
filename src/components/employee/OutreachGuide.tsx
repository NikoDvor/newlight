import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SCHEDULE_HELP, type PhoneType } from "@/lib/outreach";

/**
 * Click-by-click walkthrough for the Text & LinkedIn module. Written for someone who has never seen it.
 * Every line is tagged: ✋ (the rep does it) or 🤖 (the app does it). "Advanced" shows the technical detail.
 */
export const GUIDE = {
  big: 0,
  text: 1, phone: 1, pull: 1, card: 1, schedule: 1, landline: 1, limits: 1, outcome: 1, book: 1, home: 1, textFlow: 1,
  linkedin: 2, liConnect: 2, liMessage: 2, import: 2, liFlow: 2, liButtons: 2,
  second: 3,
} as const;

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
      app: "This page helps you text and LinkedIn-message advisors. You send every message yourself from your own phone and LinkedIn. The app gets it ready, keeps count, and tracks what works. Nothing here is a robot.",
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
        H("What the app can't do"),
        P("It can't send a message for you."),
        P("It can't see replies, so you log them."),
        P("It can't see LinkedIn accepts, so you tap Accepted."),
        P("It can't schedule LinkedIn. You schedule texts on your own phone."),
      ],
      remember: "If you don't tap the buttons, the app has no idea what you did. Your numbers will be wrong.",
      adv: [
        "Nothing here is a bot. There is no shared number and no SMS service. Every send is a human tap in the phone's own Messages app or in LinkedIn.",
        "Tables: nl_text_leads (one row per person per rep), nl_text_sends (one row per send, with the template used), nl_text_templates. Database functions check you are a signed-in rep before they run.",
        "Limits: 40 texts a day (25 Android), 20 LinkedIn invitations, 40 LinkedIn messages. One text per firm per day. 8am to 8pm where the lead lives.",
      ],
    },
    {
      title: "Text: step by step",
      app: "Texting is simple: the app gets the text ready, you send it from your phone, then you tell the app what happened.",
      lines: [
        H("Your weekly rhythm"),
        M("Monday by 7:30am: schedule your Monday, Tuesday and Wednesday texts."),
        M("Wednesday by 7:30am: schedule your Thursday and Friday texts."),
        M("Every day: check replies and log what happened."),
        A("Your home page reminds you until you have planned enough."),
        H("1. Pick your phone (one time)"),
        M("Tap Get more leads & settings, then My phone, and pick yours."),
        A("The app sets your limit (40 iPhone, 25 Android) and shows the right scheduling steps."),
        H("2. Get your people"),
        M("Tap Text. Tap Get more leads & settings. Type 40. Tap Pull leads."),
        A("The app picks 40 people with phone numbers. It skips anyone who said stop, was already picked, or is Won or Lost."),
        A("A pulled lead is yours for texting only. It stays in the Dialer and can still be called."),
        H("3. Pick the message"),
        M("Tap a letter, A to H. The message appears with their name in it. Change any words you want."),
        A("Each letter shows how many were sent and what percent replied. A ★ marks the best one."),
        H("4. Send it now"),
        M("Tap Text."),
        A("Messages opens with the number and message ready."),
        M("Tap the send arrow in Messages. Come back and tap Sent."),
        A("The app counts it and moves the card to Awaiting reply."),
        H("5. Or send it later: " + sched.title),
        ...sched.steps.map((x) => M(x)),
        A("The app suggests times: 9 to 11:30 and 1 to 3:30 where they live. The card moves to Scheduled, then to Awaiting reply when the time passes."),
        P(sched.note),
        H("6. If the number doesn't work"),
        M("Tap Landline."),
        A("The app removes it and counts it toward nothing."),
        H("7. When someone replies"),
        M("Read the reply in Messages and answer it there. Need help? Tap Second message guide."),
        M("In the app, open Awaiting reply and tap Log outcome."),
        A("The app updates your numbers. If you pick Stop, that number never gets a message again."),
        H("8. Book it"),
        M("Tap Book and fill in the first form."),
        A("The app puts them in your pipeline."),
      ],
      adv: [
        "Pull: nl_text_pull('text'). Send: nl_text_send. Outcome: nl_text_outcome. Book: nl_text_book.",
        "Scheduling lives on the phone. The app only stores the time you picked so it can count and remind you.",
        "Won or Lost anywhere removes the firm from every other rep's list. Reply and booked rates come only from outcomes reps log.",
      ],
    },
    {
      title: "LinkedIn: step by step",
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
        M("On LinkedIn, tap Messaging. Read the replies and answer them there. Need help? Tap Second message guide."),
        M("In the app, open Awaiting reply and tap Log outcome."),
        A("The app updates your numbers. If someone wants a meeting, tap Book."),
        H("Once a week"),
        M("Monday: tap Get more leads & settings and pull about 100 LinkedIn leads for the week."),
        M("Friday: on LinkedIn tap My Network, Invitations, then Sent. Withdraw invitations older than 3 weeks."),
        H("The 3 LinkedIn buttons"),
        P("Connect: the blue button at the top of a profile (or under the three dots). It sends the invitation. 20 a day."),
        P("Message: only use it after they accepted. If LinkedIn mentions credits or InMail, stop. They haven't accepted, and InMail uses up limited credits. 40 a day."),
        P("Follow: + Follow under Activity on a profile. Optional warm-up. It sends nothing and the app doesn't track it. Keep it to about 10 to 20 a day."),
        H("Have your own list?"),
        M("Tap Get more leads & settings, then Import LinkedIn leads. Tap Download example to see the columns, choose your CSV file, and tap Import."),
        A("The app shows a preview, adds the cards, and skips repeats and bad links. Only linkedin_url is required. Up to 500 rows."),
      ],
      adv: [
        "Pull: nl_text_pull('linkedin'). Invitations and messages are separate sends (cap 20 and 40 a day). The app has no LinkedIn connection and can't send, schedule, or see accepts and replies.",
        "LinkedIn limits invitations to about 100 a week. Too many ignored invitations can restrict the account, so spread them out and don't send all 20 in one minute.",
        "Connect gets a two-way link once they accept. Follow is one-way and lets you see their posts but not message them.",
      ],
    },
    {
      title: "Second message: your reply",
      app: "The first message is a template. Your reply after they answer can't have a complete guide, because every reply is different. Use the BDR Script as inspiration, not word for word.",
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
      adv: ["Training links: Module 6 (The Sales System), chapter 2 is the BDR Script. Module 7 is Objection Handling."],
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
