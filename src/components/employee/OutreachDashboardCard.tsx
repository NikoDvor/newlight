import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Check, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { DEFAULT_CAPS, canSchedule, capForPhone, laDay, type PhoneType } from "@/lib/outreach";

/**
 * Rep dashboard card: today's marks for texts + LinkedIn, and the Monday / Wednesday "schedule your texts" reminder.
 * Monday covers Mon–Wed, Wednesday covers Thu–Fri. In-app only (no push yet).
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

  // Planning reminder: Monday → Mon–Wed (3 days), Wednesday → Thu–Fri (2 days).
  const day = dow(now);
  const planDays = day === "Mon" ? [0, 1, 2] : day === "Wed" ? [1, 2] : null;
  let plan: { label: string; planned: number; target: number } | null = null;
  if (planDays && canSchedule(data.phone)) {
    const days = planDays.map((n) => laDay(new Date(now.getTime() + n * 86400000)));
    const planned = data.sends.filter((x) => x.channel === "text" && days.includes(laDay(x.sent_at))).length;
    plan = { label: day === "Mon" ? "Schedule Mon–Wed texts" : "Schedule Thu–Fri texts", planned, target: planDays.length * textCap };
  }
  const planDone = plan ? plan.planned >= plan.target : true;

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
          <span><b>{plan.label}.</b> {plan.planned} of {plan.target} planned. Open Outreach and schedule the rest with Send Later.</span>
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
