import { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarClock, Database, Mail, Route, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const stages = [
  {
    id: "scraping", short: "Lead Scraping", title: "Lead Scraping",
    happens: "Admin sources financial firms through lead sourcing / street discovery. Leads land in nl_bdr_leads, assigned to a salesman, at stage Cold.",
    rep: "See assigned firms in My Leads and the Dialer.",
    system: "Makes the assigned leads available in My Leads and the Dialer.",
    stored: ["nl_bdr_leads"],
    outcomes: ["Cold — ready for outreach."],
  },
  {
    id: "dialer", short: "Dialer", title: "Dialer",
    happens: "The rep calls the prospect. Every dial, call outcome, and objection is logged.",
    rep: "Call the firm, record the outcome and objections, and get the prospect to book on the rep’s Form 1 link.",
    system: "Logs dials in nl_bdr_dial_log, call outcomes in bdr_call_outcomes, and objections in nl_bdr_objections.",
    stored: ["nl_bdr_leads", "nl_bdr_dial_log", "bdr_call_outcomes", "nl_bdr_objections"],
    outcomes: ["Reached + interested → Warm.", "Callback / follow-up → Hot.", "Goal → prospect books through Form 1."],
  },
  {
    id: "form-1", short: "Form 1", title: "Form 1 — Discovery booking", path: "/bdr/book/{rep-slug}",
    happens: "The prospect opens the rep’s public booking link and picks a time.",
    rep: "Share the rep’s Form 1 link and attend the booked Discovery meeting.",
    system: "Creates or reuses the lead at stage Hot; creates Discovery #1 on the rep’s calendar and a Zoom link; texts the prospect only if they ticked text consent; emails the prospect the confirmation, Zoom link, and calendar invite; texts and emails the rep; alerts ops; and auto-creates the client’s workspace and login. Reminders go out 24h / 3h / 15min before.",
    stored: ["nl_bdr_leads", "bdr_calendar_events"],
    outcomes: ["Hot — Discovery #1 booked."],
  },
  {
    id: "discovery", short: "Discovery", title: "Discovery meeting → outcome",
    happens: "After the meeting time passes, “Outcome needed” appears on the dashboard card, in My Leads, and in the customer profile.",
    rep: "Pick Attended or No-show, then Won, Reschedule, or Lost. Won requires filling out Form 2 — this is the only way to win Discovery. To reschedule, choose a new time and reason. For Lost, choose a main reason from the 22 lost reasons, optional extra reasons, and a note. Cancelling is not a delete: choose Reschedule or Lost.",
    system: "Rescheduling creates Discovery #2 and re-sends the confirmation with a new Zoom. Lost moves the lead to Cold / Closed Lost and records “Lost at Discovery #n (meeting N) — reason”. If no Form 2 is submitted within 24h of Discovery, the lead auto-moves to “Expired — No Form 2”.",
    stored: ["bdr_calendar_events", "bdr_meeting_outcomes", "nl_bdr_leads"],
    outcomes: ["Won → fill out Form 2.", "Reschedule → Discovery #2.", "Lost → Cold / Closed Lost with reasons.", "No Close Prep within 24h → Expired — No Form 2."],
  },
  {
    id: "form-2", short: "Form 2", title: "Form 2 — Close Prep", path: "/employee/close-prep/{lead}",
    happens: "The rep sets pricing and books the closing meeting.",
    rep: "Complete Close Prep, set the pricing, and choose a closing meeting time.",
    system: "Creates the deal, books Closing #1 with a Zoom link, emails the prospect and rep, generates the Pay & Sign link, and logs Discovery as Won.",
    stored: ["crm_deals", "bdr_calendar_events", "bdr_meeting_outcomes"],
    outcomes: ["Discovery logged as Won; Closing #1 booked; Pay & Sign link generated."],
  },
  {
    id: "closing", short: "Closing", title: "Closing meeting → outcome",
    happens: "The closing meeting ends with Won, Reschedule, or Lost.",
    rep: "Log the meeting outcome. Won → send Pay & Sign (Form 3). Reschedule → choose a new time. Lost → record the reason.",
    system: "Rescheduling creates Closing #2 and sends a “your meeting has moved” email / text. Lost moves the lead to Cold and marks the deal lost.",
    stored: ["bdr_calendar_events", "bdr_meeting_outcomes", "nl_bdr_leads", "crm_deals"],
    outcomes: ["Won → send Pay & Sign (Form 3).", "Reschedule → Closing #2.", "Lost → lead Cold, deal lost."],
  },
  {
    id: "form-3", short: "Form 3", title: "Form 3 — Pay & Sign", path: "/pay-sign/{token}",
    happens: "The client signs the agreement and pays, then books the onboarding meeting with Zoom.",
    rep: "Send Pay & Sign after a won closing. If it isn’t completed after 7 days, choose Lost with a reason, or Still waiting for a 7-day snooze.",
    system: "Marks the deal Paid + Signed, moves the lead to Won, sends confirmations and the welcome email, and lets the client book onboarding with Zoom. Prompts the rep if Pay & Sign is not done 7 days after a won closing.",
    stored: ["crm_deals", "nl_bdr_leads", "document_envelopes", "invoices", "bdr_calendar_events", "bdr_meeting_outcomes"],
    outcomes: ["Paid + Signed → lead Won; onboarding booked.", "Stalled → Lost (reason), or Still waiting (7-day snooze)."],
  },
  {
    id: "onboarding", short: "Onboarding", title: "Onboarding meeting → outcome",
    happens: "The onboarding meeting ends with Completed, Reschedule, or Lost.",
    rep: "Log Completed to activate the client, choose a new time to reschedule, or record a reason for Lost.",
    system: "Completed marks the client Activated. Reschedule creates Onboarding #2. Lost records the reason.",
    stored: ["bdr_calendar_events", "bdr_meeting_outcomes", "crm_deals"],
    outcomes: ["Completed → client Activated.", "Reschedule → Onboarding #2.", "Lost → reason recorded."],
  },
];

const dataRows = [
  ["Leads & stage", "nl_bdr_leads", "Rep (own) + admin"],
  ["Every meeting, including rescheduled / cancelled; meeting number and attempt #", "bdr_calendar_events", "Rep calendar + admin"],
  ["Meeting outcomes: won / rescheduled / lost, reason, attendance, meeting number", "bdr_meeting_outcomes", "Rep (own) + admin"],
  ["Dials / call outcomes / objections", "nl_bdr_dial_log, bdr_call_outcomes, nl_bdr_objections", "—"],
  ["Deals & payment status", "crm_deals", "—"],
  ["Agreements", "document_envelopes", "—"],
  ["Invoices", "invoices", "—"],
  ["Change history", "audit_logs", "—"],
];

export default function PipelineGuide() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin/");
  const [openStages, setOpenStages] = useState<string[]>(["scraping"]);
  const [activeStage, setActiveStage] = useState("scraping");
  const sections = useRef<Record<string, HTMLDivElement | null>>({});

  function selectStage(id: string) {
    setActiveStage(id);
    setOpenStages((current) => current.includes(id) ? current : [...current, id]);
    requestAnimationFrame(() => {
      sections.current[id]?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 min-w-0 pb-8">
      <header className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link to={isAdmin ? "/admin/training-center" : "/employee/training"}><ArrowLeft className="mr-2 h-4 w-4" />Training Center</Link>
        </Button>
        <div className="flex items-center gap-3"><Route className="h-7 w-7 text-primary" /><h1 className="text-3xl font-semibold text-foreground">Pipeline Guide</h1></div>
        <p className="text-muted-foreground">How a lead moves from scrape to activated client</p>
      </header>

      <nav aria-label="Pipeline stages" className="grid grid-cols-1 md:grid-cols-8 gap-2">
        {stages.map((stage, index) => (
          <Button key={stage.id} variant={activeStage === stage.id ? "default" : "outline"} onClick={() => selectStage(stage.id)} aria-current={activeStage === stage.id ? "step" : undefined} aria-controls={`stage-${stage.id}`} className="h-auto min-h-14 p-3 justify-start md:justify-center md:flex-col gap-2 whitespace-normal text-left md:text-center">
            <span className="text-xs opacity-70 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
            <span className="text-xs leading-4">{stage.short}</span>
          </Button>
        ))}
      </nav>

      <Accordion type="multiple" value={openStages} onValueChange={setOpenStages}>
        {stages.map((stage, index) => (
          <AccordionItem key={stage.id} value={stage.id} id={`stage-${stage.id}`} ref={(element) => { sections.current[stage.id] = element; }} className="scroll-mt-6">
            <AccordionTrigger className="gap-4 hover:no-underline text-left" onClick={() => setActiveStage(stage.id)}>
              <span className="flex items-center gap-4"><span className="text-primary text-sm tabular-nums">{String(index + 1).padStart(2, "0")}</span><span className="text-lg font-semibold">{stage.title}</span></span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 space-y-5">
              {stage.path && <code className="block text-xs text-primary break-all">{stage.path}</code>}
              <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-5 text-sm leading-relaxed">
                <div><dt className="font-semibold text-foreground mb-1">What happens</dt><dd className="text-muted-foreground">{stage.happens}</dd></div>
                <div><dt className="font-semibold text-foreground mb-1">What the rep does</dt><dd className="text-muted-foreground">{stage.rep}</dd></div>
                <div className="sm:col-span-2"><dt className="font-semibold text-foreground mb-1">What the system does automatically</dt><dd className="text-muted-foreground">{stage.system}</dd></div>
                <div><dt className="font-semibold text-foreground mb-2">Where it’s stored</dt><dd className="flex flex-wrap gap-2">{stage.stored.map((table) => <code key={table} className="text-xs text-primary break-all">{table}</code>)}</dd></div>
                <div><dt className="font-semibold text-foreground mb-1">Possible outcomes</dt><dd><ul className="space-y-1 text-muted-foreground">{stage.outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul></dd></div>
              </dl>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <section className="space-y-4" aria-labelledby="data-heading">
        <h2 id="data-heading" className="text-xl font-semibold flex items-center gap-2"><Database className="h-5 w-5 text-primary" />Where the data lives</h2>
        <div className="overflow-x-auto rounded-lg border border-border" role="region" aria-label="Where the data lives table" tabIndex={0}>
          <table className="w-full min-w-[680px] text-sm text-left">
            <thead className="bg-muted/50"><tr>{["What", "Table", "Who sees it"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
            <tbody>{dataRows.map(([what, table, who]) => <tr key={table} className="border-t border-border"><td className="px-4 py-3 text-muted-foreground">{what}</td><td className="px-4 py-3"><code className="text-xs text-primary">{table}</code></td><td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{who}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-6" aria-labelledby="numbers-heading">
        <h2 id="numbers-heading" className="text-xl font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Where to see the numbers</h2>
        <div className="grid sm:grid-cols-2 gap-6 text-sm leading-relaxed">
          <div className="space-y-2"><h3 className="font-semibold">Rep</h3><ul className="space-y-2 text-muted-foreground"><li>My Leads — each card: meetings · reschedules · attendance % · Lost at meeting N / Won.</li><li>Customer profile → Meeting journey — full timeline.</li><li>My Stats — own close rates, where and why leads are lost, and lead journeys.</li></ul>{!isAdmin && <Button asChild variant="link" className="px-0"><Link to="/employee/my-stats">My Stats <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}</div>
          <div className="space-y-2"><h3 className="font-semibold">Admin</h3><p className="text-muted-foreground">Admin → Sales → BDR Meeting Analytics — team and per-salesman close rates, attendance, reschedule recovery, lost-on-which-meeting, why-lost by stage, lead journeys table, and drill-down.</p>{isAdmin && <Button asChild variant="link" className="px-0"><Link to="/admin/bdr-meeting-analytics">BDR Meeting Analytics <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}</div>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-6" aria-labelledby="messages-heading">
        <h2 id="messages-heading" className="text-xl font-semibold flex items-center gap-2"><Mail className="h-5 w-5 text-primary" />Messages & reminders</h2>
        <div className="grid sm:grid-cols-2 gap-6 text-sm leading-relaxed text-muted-foreground">
          <div className="space-y-2"><p>Texts come from <span className="font-medium text-foreground">(855) 506-6111</span> and only go to prospects who ticked the text-consent box.</p><p>First text includes <span className="text-foreground">“Reply STOP to opt out.”</span></p><p>Emails come from <span className="text-foreground break-all">team@newlightgen.com</span>.</p></div>
          <div className="space-y-2"><p className="flex items-center gap-2 text-foreground font-medium"><CalendarClock className="h-4 w-4 text-primary" />24h / 3h / 15m before</p><p>Reminders are never sent for rescheduled or cancelled meetings.</p></div>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-6" aria-labelledby="legend-heading">
        <h2 id="legend-heading" className="text-xl font-semibold">Lead stages</h2>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 text-sm">
          {[{ label: "Cold", description: "Not reached / lost", tone: "text-primary border-primary/30" }, { label: "Warm", description: "Reached, interested", tone: "text-warning border-warning/30" }, { label: "Hot", description: "Follow-up or meeting booked", tone: "text-accent border-accent/30" }, { label: "Won", description: "Paid + signed", tone: "text-success border-success/30" }].map((stage, index) => <div key={stage.label} className="flex items-center gap-2"><Badge variant="outline" className={stage.tone}>{stage.label}</Badge><span className="text-muted-foreground">{stage.description}</span>{index < 3 && <ArrowRight className="hidden sm:block h-4 w-4 text-muted-foreground" aria-hidden="true" />}</div>)}
        </div>
        <p className="text-sm text-muted-foreground"><Badge variant="secondary" className="mr-2">Expired — No Form 2</Badge>24h after Discovery without Close Prep.</p>
      </section>
    </div>
  );
}