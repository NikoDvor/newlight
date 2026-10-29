import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, AlertTriangle, CalendarPlus, ClipboardCheck, FileSignature, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * "Today" strip — the first thing to read each morning, on admin Pipeline
 * (scope="team", optional salesman) and the salesman's My Pipeline (scope="mine").
 *   Meetings today · Outcomes overdue · Form 1s this week · Form 2s this week ·
 *   Pay & Signs waiting · Won this month. Each tile links to where you act on it.
 */
const TRACKED = ["discovery", "closing", "onboarding", "check_in"];

function startOfWeek(d = new Date()) {
  const x = new Date(d); const day = (x.getDay() + 6) % 7; // Monday
  x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x;
}

export default function TodayStrip({ scope, repUserId }: { scope: "team" | "mine"; repUserId?: string }) {
  const [v, setV] = useState<Record<string, number | null>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = supabase as any;
      let uid: string | null = repUserId || null;
      if (scope === "mine") {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id || null;
        if (!uid) return;
      }
      const now = new Date();
      const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400_000);
      const weekStart = startOfWeek(now);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const ev = () => {
        let q = db.from("bdr_calendar_events").select("id", { count: "exact", head: true })
          .in("meeting_kind", TRACKED).not("lead_id", "is", null)
          .or("attendance.is.null,attendance.not.in.(rescheduled,cancelled)");
        if (uid) q = q.eq("user_id", uid);
        return q;
      };
      const deals = (sel = "id") => {
        let q = db.from("crm_deals").select(sel, { count: "exact", head: sel === "id" });
        if (uid) q = q.eq("assigned_user", uid);
        return q;
      };
      let pastQ = db.from("bdr_calendar_events").select("id")
        .in("meeting_kind", TRACKED).not("lead_id", "is", null).lt("starts_at", now.toISOString())
        .or("attendance.is.null,attendance.not.in.(rescheduled,cancelled)").order("starts_at", { ascending: false }).limit(500);
      if (uid) pastQ = pastQ.eq("user_id", uid);
      let wonClosingQ = db.from("bdr_meeting_outcomes").select("lead_id").eq("meeting_kind", "closing").eq("result", "won").limit(500);
      if (uid) wonClosingQ = wonClosingQ.eq("rep_user_id", uid);

      const [today, form1, form2, won, past, wonClosing] = await Promise.all([
        ev().gte("starts_at", dayStart.toISOString()).lt("starts_at", dayEnd.toISOString()),
        ev().in("source", ["booking_form", "round_robin", "external_booking"]).eq("reschedule_count", 0).gte("created_at", weekStart.toISOString()),
        deals().gte("close_prep_completed_at", weekStart.toISOString()),
        deals().gte("paid_signed_at", monthStart.toISOString()),
        pastQ,
        wonClosingQ,
      ]);

      let overdue = 0;
      const pastIds = (past.data || []).map((e: any) => e.id);
      if (pastIds.length) {
        const { data: outs } = await db.from("bdr_meeting_outcomes").select("event_id, meeting_kind").in("event_id", pastIds);
        const logged = new Set((outs || []).filter((o: any) => o.meeting_kind !== "pay_sign").map((o: any) => o.event_id));
        overdue = pastIds.filter((id: string) => !logged.has(id)).length;
      }
      let waiting = 0;
      const wl = Array.from(new Set((wonClosing.data || []).map((o: any) => o.lead_id)));
      if (wl.length) {
        const { data: leads } = await db.from("nl_bdr_leads").select("id, crm_deal_id").in("id", wl);
        const dealIds = (leads || []).map((l: any) => l.crm_deal_id).filter(Boolean);
        if (dealIds.length) {
          const { data: ds } = await db.from("crm_deals").select("id, pay_sign_status").in("id", dealIds);
          waiting = (ds || []).filter((d: any) => d.pay_sign_status !== "paid_signed").length;
        }
      }
      if (cancelled) return;
      setV({ today: today.count ?? 0, overdue, form1: form1.count ?? 0, form2: form2.count ?? 0, waiting, won: won.count ?? 0 });
    })();
    return () => { cancelled = true; };
  }, [scope, repUserId]);

  const team = scope === "team";
  const tiles = [
    { k: "today", label: "Meetings today", icon: CalendarClock, to: team ? "/admin/pipeline/meetings" : "/employee/calendar", color: "hsl(199,90%,62%)" },
    { k: "overdue", label: "Outcomes overdue", icon: AlertTriangle, to: team ? "/admin/pipeline/meetings" : "/employee", color: "hsl(0,72%,64%)", alert: true },
    { k: "form1", label: "Form 1s this week", icon: CalendarPlus, to: team ? "/admin/pipeline/board" : "/employee/leads", color: "hsl(38,92%,58%)" },
    { k: "form2", label: "Form 2s this week", icon: ClipboardCheck, to: team ? "/admin/pipeline/board" : "/employee/leads", color: "hsl(14,90%,62%)" },
    { k: "waiting", label: "Pay & Signs waiting", icon: FileSignature, to: team ? "/admin/pipeline/board" : "/employee/leads", color: "hsl(268,82%,72%)", alert: true },
    { k: "won", label: "Won this month", icon: Trophy, to: team ? "/admin/pipeline/board" : "/employee/leads", color: "hsl(142,72%,50%)" },
  ];

  return (
    <div data-tour="today" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {tiles.map((t) => {
        const n = v[t.k];
        const hot = t.alert && (n ?? 0) > 0;
        return (
          <Link key={t.k} to={t.to}
            className={`rounded-xl px-3 py-2.5 border transition-colors hover:bg-white/[0.06] ${hot ? "border-red-500/35 bg-red-500/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold" style={{ color: t.color }}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </div>
            <div className="text-2xl font-bold tabular-nums mt-1 text-foreground">{n == null ? "—" : n}</div>
          </Link>
        );
      })}
    </div>
  );
}
