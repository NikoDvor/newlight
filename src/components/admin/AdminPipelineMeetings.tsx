import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import CustomerProfilePanel from "@/components/CustomerProfilePanel";
import { OUTCOME_KINDS, kindAttemptLabel } from "@/components/employee/MeetingOutcomeSheet";

/**
 * Admin → Pipeline → Meetings. Every salesman's tracked meetings that still
 * need an outcome (the salesman logs it; this is the admin's watch-list),
 * plus every upcoming meeting in the next 14 days. Click → Customer profile.
 */
interface Row { id: string; lead_id: string; user_id: string; meeting_kind: string; attempt_number: number | null; starts_at: string; is_external: boolean; business_name?: string }

export default function AdminPipelineMeetings({ repUserId, since }: { repUserId?: string; since?: string | null }) {
  const [pending, setPending] = useState<Row[]>([]);
  const [upcoming, setUpcoming] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [openLead, setOpenLead] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const db = supabase as any;
      const now = new Date();
      const base = () => {
        let q = db.from("bdr_calendar_events")
          .select("id, lead_id, user_id, meeting_kind, attempt_number, starts_at, is_external")
          .in("meeting_kind", OUTCOME_KINDS as unknown as string[])
          .not("lead_id", "is", null)
          .or("attendance.is.null,attendance.not.in.(rescheduled,cancelled)");
        if (repUserId) q = q.eq("user_id", repUserId);
        return q;
      };
      const [{ data: past }, { data: next }] = await Promise.all([
        (since ? base().gte("starts_at", since) : base()).lt("starts_at", now.toISOString()).order("starts_at", { ascending: false }).limit(300),
        base().gte("starts_at", now.toISOString()).lt("starts_at", new Date(now.getTime() + 14 * 86400_000).toISOString())
          .order("starts_at", { ascending: true }).limit(300),
      ]);
      const pastIds = (past || []).map((e: any) => e.id);
      const logged = new Set<string>();
      if (pastIds.length) {
        const { data: outs } = await db.from("bdr_meeting_outcomes").select("event_id, meeting_kind").in("event_id", pastIds);
        (outs || []).forEach((o: any) => { if (o.meeting_kind !== "pay_sign") logged.add(o.event_id); });
      }
      const pend: Row[] = (past || []).filter((e: any) => !logged.has(e.id));
      const all = [...pend, ...(next || [])];
      const leadIds = Array.from(new Set(all.map((e) => e.lead_id)));
      const userIds = Array.from(new Set(all.map((e) => e.user_id)));
      const [{ data: leads }, { data: emps }] = await Promise.all([
        leadIds.length ? db.from("nl_bdr_leads").select("id, business_name").in("id", leadIds) : Promise.resolve({ data: [] }),
        userIds.length ? db.from("employee_profiles").select("user_id, full_name").in("user_id", userIds) : Promise.resolve({ data: [] }),
      ]);
      if (cancelled) return;
      const lm = new Map((leads || []).map((l: any) => [l.id, l.business_name]));
      const withName = (r: Row) => ({ ...r, business_name: (lm.get(r.lead_id) as string) || "—" });
      setPending(pend.map(withName));
      setUpcoming((next || []).map(withName));
      setNames(Object.fromEntries((emps || []).map((e: any) => [e.user_id, e.full_name])));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [repUserId, since]);

  const when = (iso: string) => new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const daysAgo = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000));

  const table = (rows: Row[], kind: "pending" | "upcoming") => (
    rows.length === 0 ? (
      <p className="py-6 text-center text-sm text-white/40">{loading ? "Loading…" : kind === "pending" ? "Every meeting has an outcome." : "No meetings in the next 14 days."}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-white/50">
              <th className="py-2 pr-3 font-medium">Salesman</th>
              <th className="py-2 pr-3 font-medium">Lead</th>
              <th className="py-2 pr-3 font-medium">Meeting</th>
              <th className="py-2 pr-3 font-medium">When</th>
              <th className="py-2 font-medium">{kind === "pending" ? "Waiting" : ""}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onClick={() => setOpenLead(r.lead_id)} className="border-t border-white/5 text-white/85 cursor-pointer hover:bg-white/[0.03]">
                <td className="py-2 pr-3 whitespace-nowrap">{names[r.user_id] || "Salesman"}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.business_name}</td>
                <td className="py-2 pr-3 whitespace-nowrap">
                  {kindAttemptLabel(r.meeting_kind as any, r.attempt_number)}
                  {r.is_external && <span className="ml-1.5 text-[10px] text-amber-300">away</span>}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap tabular-nums">{when(r.starts_at)}</td>
                <td className="py-2 whitespace-nowrap tabular-nums">
                  {kind === "pending" && (
                    <span className={daysAgo(r.starts_at) >= 2 ? "text-red-400" : "text-amber-300"}>
                      {daysAgo(r.starts_at) === 0 ? "today" : `${daysAgo(r.starts_at)}d`}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  );

  return (
    <div className="space-y-4">
      <Card className="border-0 bg-white/[0.03]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white">Needs an outcome ({pending.length})</CardTitle>
          <p className="text-xs text-white/45">Meetings that happened but the salesman hasn't logged Won, Rescheduled or Lost yet.</p>
        </CardHeader>
        <CardContent>{table(pending, "pending")}</CardContent>
      </Card>
      <Card className="border-0 bg-white/[0.03]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white">Upcoming — next 14 days ({upcoming.length})</CardTitle>
        </CardHeader>
        <CardContent>{table(upcoming, "upcoming")}</CardContent>
      </Card>
      <CustomerProfilePanel open={!!openLead} onOpenChange={(o) => { if (!o) setOpenLead(null); }} leadId={openLead} />
    </div>
  );
}
