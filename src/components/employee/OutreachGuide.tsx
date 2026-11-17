import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SCHEDULE_HELP, type PhoneType } from "@/lib/outreach";

/** Click-by-click walkthrough for the Text & LinkedIn module. Written for someone who has never seen it. */
export const GUIDE = { big: 0, phone: 1, pull: 2, card: 3, text: 4, schedule: 5, landline: 6, liConnect: 7, liMessage: 8, import: 9, limits: 10, outcome: 11, book: 12, home: 13 } as const;

interface Step { title: string; app: string; clicks: string[]; remember?: string }

function steps(phone: PhoneType): Step[] {
  const sched = SCHEDULE_HELP[phone];
  return [
    {
      title: "The big picture",
      app: "This page helps you send texts and LinkedIn messages to advisors. YOU send every message from your own phone and your own LinkedIn. The app gets the message ready, counts what you send, and keeps track of replies.",
      clicks: [
        "1. You pull a list of people to message.",
        "2. You tap a button. The message is already written with their name in it.",
        "3. You send it yourself.",
        "4. You tap a button in the app to say you sent it.",
        "5. When someone writes back, you tap what happened.",
        "6. If they want a meeting, you tap Book.",
      ],
      remember: "The app never sends anything for you, and it can't see replies. If you don't tap the buttons, the app has no idea what you did.",
    },
    {
      title: "Pick your phone",
      app: "Different phones can do different things. The app uses your answer to set your daily limit and show you the right steps.",
      clicks: [
        "1. Find the box that says My phone at the top of the page.",
        "2. Tap the box.",
        "3. Pick the one that matches your phone: iPhone with iOS 18 or newer, older iPhone, Android with Google Messages, or other Android.",
        "4. That's it. It saves by itself.",
      ],
      remember: "Not sure about your iPhone? Open Settings, tap General, tap About, and look at iOS Version. 18 or higher is the new one.",
    },
    {
      title: "Pull your leads",
      app: "Pulling gives you people to message. The app picks the owner of each firm when it can, skips anyone who already said stop, and never gives the same person to two reps.",
      clicks: [
        "1. Look at the row with the number box and the State box. The blue Pull leads button is on the right.",
        "2. Type how many you want in the number box. 40 is a normal day for texting.",
        "3. Leave State empty to get any state. Or type two letters like CA for just California.",
        "4. Tap Pull leads.",
        "5. A message pops up that says how many were added. They show up in the To text list (or To connect list on LinkedIn).",
      ],
      remember: "A lead you pull is yours for texting only. It stays in the Dialer, and anyone can still call it.",
    },
    {
      title: "Read a lead card",
      app: "Each person is a card. It shows what you need and the message ready to send.",
      clicks: [
        "1. At the top of the card: the firm name, the person's name, their city and how big the firm is.",
        "2. Under that is a small box with a template name. Tap it to pick a different message.",
        "3. The big box is the message. Their first name, the firm and your name are already filled in.",
        "4. You can tap in the big box and change any words you want.",
        "5. Changed your mind? Tap Reset to template.",
      ],
      remember: "Read the message before you send it. If a name looks wrong or says \"there\", fix it.",
    },
    {
      title: "Send a text",
      app: "The Text button opens your Messages app with the text already typed. It does not send it.",
      clicks: [
        "1. On the card, tap the blue Text button.",
        "2. Your Messages app opens. The message is in the box and the number is filled in.",
        "3. Look at it, then tap the send arrow in Messages. Now it's sent.",
        "4. Go back to this app.",
        "5. Tap Sent on the card. Now the app counts it. The card moves to Awaiting reply.",
      ],
      remember: "If Messages opens with an empty box, tap Copy on the card, then paste into the box. Texting only works well from your phone, not a computer.",
    },
    {
      title: sched.title,
      app: "You can have your phone send the text later. Plan 3 days at a time. Schedule Monday to Wednesday by Monday at 7:30am, so do it Sunday or early Monday. Schedule Thursday and Friday by Thursday at 7:30am, so do it Wednesday. The app reminds you on your home page. It also suggests times: weekdays, 9 to 11:30 and 1 to 3:30 where the person lives, about 6 minutes apart.",
      clicks: [...sched.steps.map((s, i) => `${i + 1}. ${s}`)],
      remember: sched.note,
    },
    {
      title: "If the number doesn't work",
      app: "Some numbers are landlines or old numbers, and they can't get texts. The Landline button takes the lead out without hurting your numbers.",
      clicks: [
        "1. A text says Not Delivered, or you know it's an office line.",
        "2. On the card, tap Landline.",
        "3. The lead moves to the Done list.",
        "4. It doesn't count toward your daily texts or any stats. No other rep gets that number.",
      ],
      remember: "You can use Landline even after you tapped Sent. It removes that send.",
    },
    {
      title: "LinkedIn, part 1: ask to connect",
      app: "On LinkedIn you usually have to be connected before you can message someone. So the first step is a connection request with a short note.",
      clicks: [
        "1. Tap the LinkedIn button near the top of the page.",
        "2. Tap Pull leads to get people who have a LinkedIn link. Or use Import LinkedIn leads (see that step).",
        "3. On a card in To connect, tap Copy + open profile. Their profile opens and the note is copied.",
        "4. On LinkedIn, tap Connect, then Add a note, then paste.",
        "5. Tap Send on LinkedIn.",
        "6. Go back to this app and tap Request sent. The card moves to Requested.",
      ],
      remember: "LinkedIn can't be scheduled. Send it the same day. If a card has no LinkedIn link, find it under No LinkedIn and paste the link in.",
    },
    {
      title: "LinkedIn, part 2: message them",
      app: "Once they accept, you can send them a real message. The app can't see when they accept, so you check LinkedIn yourself.",
      clicks: [
        "1. Open LinkedIn and look at your notifications or My Network for accepted requests.",
        "2. In this app, open the Requested list.",
        "3. Find that person and tap Accepted. They move to To message.",
        "4. Tap Copy + open profile, then tap Message on LinkedIn, paste, and send.",
        "5. Back in the app, tap Message sent. They move to Awaiting reply.",
      ],
      remember: "Don't tap Accepted until they really did. You can undo it with Undo send.",
    },
    {
      title: "Import LinkedIn leads",
      app: "Got a spreadsheet of LinkedIn profiles from lead research? Bring it in and the app turns each row into a card.",
      clicks: [
        "1. Tap the LinkedIn button, then tap Import LinkedIn leads.",
        "2. Tap Download example if you want to see the right columns. You need at least a LinkedIn link in every row.",
        "3. Tap Choose file and pick your CSV file.",
        "4. Look at the preview. It shows how many rows it found.",
        "5. Tap Import. A message tells you how many were added, how many were already in the system, and how many had a bad link.",
      ],
      remember: "The columns are: first_name, last_name, firm, linkedin_url, phone, city, state. Only linkedin_url is required. Up to 500 rows at a time.",
    },
    {
      title: "Daily goals and limits",
      app: "The numbers at the top show how many you sent today. When the bar is full, you hit your goal and get a check mark.",
      clicks: [
        "1. Look at the boxes at the top: texts sent, LinkedIn requests, LinkedIn messages and texts scheduled.",
        "2. Each shows a number like 12 / 40. That means 12 done, goal is 40.",
        "3. The bar fills up and turns green when you hit it.",
        "4. The app won't let you go past your limit for the day.",
      ],
      remember: "Texts: 40 a day on iPhone, 25 on Android. LinkedIn: 20 requests and 40 messages. Only send from 8am to 8pm where the person lives. One text per firm per day.",
    },
    {
      title: "When someone replies",
      app: "Replies show up in your own Messages or LinkedIn, not in this app. You answer them there. Then you tell the app what happened.",
      clicks: [
        "1. Open the Awaiting reply list.",
        "2. Find the person who wrote back.",
        "3. Tap the box that says Log outcome.",
        "4. Pick what happened, like Need to Think, Not Interested or Said They Would Reach Out.",
        "5. If they asked you to stop, pick Stop. They will never get another message.",
        "6. No answer after a few days? Pick No Reply.",
      ],
      remember: "These are the same outcomes as the Dialer, plus No Reply, Wrong Number and Stop. If you skip this step, your numbers will be wrong.",
    },
    {
      title: "Book the meeting",
      app: "When someone wants to talk, one tap sends them into your pipeline.",
      clicks: [
        "1. After you log a good reply, a blue Book button shows on the card.",
        "2. Tap Book.",
        "3. The first form opens. Fill it in like you do for a call.",
        "4. From here the normal pipeline takes over.",
      ],
      remember: "If you already had that firm in your Dialer, Book uses that same lead.",
    },
    {
      title: "Your home page",
      app: "Your home page shows how today is going, so you don't have to open this page to check.",
      clicks: [
        "1. Open the home page when you log in.",
        "2. Find the Text & LinkedIn today box.",
        "3. It shows each goal and how many are left. A green check means you hit it.",
        "4. From Sunday to Tuesday a yellow reminder says to schedule Monday to Wednesday texts by Monday 7:30am. From Wednesday to Friday it says to schedule Thursday and Friday texts by Thursday 7:30am. It says Overdue if the time passed. It goes away when you've planned enough.",
        "5. Tap Open outreach to jump back here.",
      ],
    },
  ];
}

export function OutreachGuide({ open, onOpenChange, startAt = 0, phoneType }: { open: boolean; onOpenChange: (o: boolean) => void; startAt?: number; phoneType: PhoneType }) {
  const [i, setI] = useState(startAt);
  useEffect(() => { if (open) setI(startAt); }, [open, startAt]);
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
          <div className="mb-1.5 text-[12px] font-bold uppercase tracking-wide opacity-70">Click by click</div>
          <ul className="grid gap-1.5 text-[14px] leading-snug">{s.clicks.map((c, k) => <li key={k}>{c}</li>)}</ul>
        </div>
        {s.remember && <p className="rounded-xl border border-[hsl(38,95%,58%)]/40 bg-[hsla(38,95%,58%,.08)] p-3 text-[13.5px]"><b>Remember: </b>{s.remember}</p>}
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
