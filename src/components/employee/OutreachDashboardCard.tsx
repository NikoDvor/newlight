import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Check, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { DEFAULT_CAPS, canSchedule, capForPhone, laDay, type PhoneType } from "@/lib/outreach";

/**
 * Rep dashboard card: today's marks for texts + LinkedIn, and the Monday / Wednesday "schedule your texts" reminder.
 * Mon–Wed texts are due scheduled by Monday 7:30am (shown Sun–Tue); Thu–Fri texts by Thursday 7:30am (shown Wed–Fri). In-app only (no push yet).
 */
const PT = "America/Los_Angeles";
const dow = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: PT, weekday: "short" }).format(d);

export function OutreachDashboardCard() {
  const { user } = useWorkspace() as any;
  const uid: string | undefined = user?.id;
  const [data, setData] = useState<{ sends: { channel: string; sent_at: string }[]; phone: PhoneType; ready: boolean } | null>(null);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const db = supabase as any;
      const since = new Date(Date.now() - 86400000).toISOString();
      const [s, st, l] = await Promise.all([
        db.from("nl_text_sends").select("channel, sent_at").eq("rep_user_id", uid).gte("sent_at", since).limit(3000),
        db.from("nl_text_settings").select("phone_type").eq("user_id", uid).maybeSingle(),
        db.from("nl_text_leads").select("id", { count: "exact", head: true }).eq("rep_user_id", uid),
      ]);
      setData({ sends: s.data || [], phone: (st.data?.phone_type as PhoneType) || "iphone_ios18", ready: (l.count || 0) > 0 });
    })();
  }, [uid]);
  if (!data) return null;

  const now = new Date();
  const today = laDay(now);
  const textCap = capForPhone(data.phone);
  const sentToday = (ch: string) => data.sends.filter((x) => x.channel === ch && laDay(x.sent_at) === today && new Date(x.sent_at) <= now).length;
  const rows = [
    { label: "Texts", used: sentToday("text"), cap: textCap },
    { label: "LinkedIn requests", used: sentToday("li_connect"), cap: DEFAULT_CAPS.li_connect },
    { label: "LinkedIn messages", used: sentToday("li_message"), cap: DEFAULT_CAPS.li_message },
  ];

  // Planning deadlines (Pacific): Mon–Wed texts scheduled by Monday 7:30am; Thu–Fri texts scheduled by Thursday 7:30am.
  const la = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: PT, weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(now).map((p) => [p.type, p.value]));
  const dayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(la.weekday);
  const mins = (Number(la.hour) % 24) * 60 + Number(la.minute);
  const dayOf = (offset: number) => laDay(new Date(now.getTime() + offset * 86400000));
  let plan: { label: string; planned: number; target: number; deadline: string; overdue: boolean } | null = null;
  if (canSchedule(data.phone)) {
    // Plan A shows Sun → Tue; Plan B shows Wed → Thu (and Fri if still not done).
    const mk = (label: string, offsets: number[], deadline: string, overdue: boolean) => {
      const days = offsets.map((o) => dayOf(o));
      plan = { label, planned: data.sends.filter((x) => x.channel === "text" && days.includes(laDay(x.sent_at))).length, target: offsets.length * textCap, deadline, overdue };
    };
    const monOff = 1 - dayIdx, thuOff = 4 - dayIdx;
    if (dayIdx === 0 || dayIdx === 1 || dayIdx === 2) mk("Schedule Mon–Wed texts", [monOff, monOff + 1, monOff + 2], "Monday 7:30am", dayIdx === 2 || (dayIdx === 1 && mins >= 450));
    else if (dayIdx === 3 || dayIdx === 4 || dayIdx === 5) mk("Schedule Thu–Fri texts", [thuOff, thuOff + 1], "Thursday 7:30am", dayIdx === 5 || (dayIdx === 4 && mins >= 450));
  }
  const planDone = plan ? (plan as any).planned >= (plan as any).target : true;

  return (
    <section className="rounded-2xl border border-white/[0.14] bg-[hsla(220,40%,9%,.78)] p-4 text-white">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[15px] font-bold"><MessageSquare className="h-4 w-4 text-[hsl(211,96%,62%)]" />Text &amp; LinkedIn today</div>
        <Link to="/employee/outreach" className="rounded-lg border border-[hsl(211,96%,56%)] bg-[hsla(211,96%,56%,.18)] px-3 py-1 text-[13px] font-semibold text-[hsl(211,96%,80%)]">
          {data.ready ? "Open outreach" : "Pull your first leads"}
        </Link>
      </div>
      {plan && !planDone && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-[hsl(38,95%,58%)]/50 bg-[hsla(38,95%,58%,.1)] px-3 py-2 text-[13.5px]">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(38,95%,62%)]" />
          <span><b>{plan.label} by {plan.deadline}.</b> {plan.planned} of {plan.target} planned.{plan.overdue ? " Overdue." : ""} Open Outreach and schedule the rest with Send Later.</span>
        </div>
      )}
      {plan && planDone && <div className="mb-3 flex items-center gap-2 text-[13px] text-[hsl(152,62%,60%)]"><Check className="h-4 w-4" />{plan.label}: done ({plan.planned} planned).</div>}
      <div className="grid gap-3 sm:grid-cols-3">
        {rows.map((r) => {
          const hit = r.used >= r.cap;
          return (
            <div key={r.label}>
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="text-white/75">{r.label}</span>
                <span className="font-mono font-bold tabular-nums">{r.used}/{r.cap} {hit && <Check className="inline h-4 w-4 text-[hsl(152,62%,52%)]" />}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-white/10"><div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, (r.used / r.cap) * 100)}%`, background: hit ? "hsl(152,62%,52%)" : "hsl(211,96%,56%)" }} /></div>
              <div className="mt-1 text-[12px] text-white/60">{hit ? "Mark hit" : `${r.cap - r.used} to go`}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
