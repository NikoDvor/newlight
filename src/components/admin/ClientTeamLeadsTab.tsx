import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const cardStyle = {
  background: "linear-gradient(180deg, hsla(215,35%,14%,.55), hsla(215,35%,10%,.55))",
  border: "1px solid hsla(211,96%,60%,.10)",
};

// Matches AdminBDRPerformance: "Schedule Callback" is the scheduled outcome; Won counts as a win.
const BOOKED_OUTCOMES = new Set(["Schedule Callback", "Won"]);

interface Member { user_id: string | null; full_name: string | null; job_title: string | null; employee_role: string | null; status: string | null; }
interface RepStats { leads: number; dials: number; outcomes: number; booked: number; meetings: number; attended: number; }

/** Page through a filtered query so large tables aren't capped at 1000 rows. */
async function fetchAll(build: (from: number, to: number) => any): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error || !data) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

export default function ClientTeamLeadsTab({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [summary, setSummary] = useState({ team: 0, leads: 0, meetings: 0, converted: 0 });
  const [stats, setStats] = useState<Record<string, RepStats>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const sb = supabase as any;
      const { data: team } = await sb.from("employee_profiles")
        .select("user_id, full_name, job_title, employee_role, status")
        .eq("client_id", clientId).order("full_name");
      const roster: Member[] = team || [];
      const ids = roster.map(m => m.user_id).filter(Boolean) as string[];
      const safeIds = ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];

      const [leadsCount, convertedCount, meetingsCount, leads, dials, outcomes, events] = await Promise.all([
        sb.from("nl_bdr_leads").select("id", { count: "exact", head: true }).eq("client_id", clientId),
        sb.from("nl_bdr_leads").select("id", { count: "exact", head: true }).eq("client_id", clientId).not("crm_deal_id", "is", null),
        sb.from("bdr_calendar_events").select("id", { count: "exact", head: true }).in("user_id", safeIds),
        fetchAll((f, t) => sb.from("nl_bdr_leads").select("user_id").eq("client_id", clientId).in("user_id", safeIds).range(f, t)),
        fetchAll((f, t) => sb.from("nl_bdr_dial_log").select("bdr_user_id").in("bdr_user_id", safeIds).range(f, t)),
        fetchAll((f, t) => sb.from("bdr_call_outcomes").select("bdr_user_id, outcome").in("bdr_user_id", safeIds).range(f, t)),
        fetchAll((f, t) => sb.from("bdr_calendar_events").select("user_id, attendance").in("user_id", safeIds).range(f, t)),
      ]);

      const s: Record<string, RepStats> = {};
      ids.forEach(id => { s[id] = { leads: 0, dials: 0, outcomes: 0, booked: 0, meetings: 0, attended: 0 }; });
      leads.forEach(r => { if (s[r.user_id]) s[r.user_id].leads++; });
      dials.forEach(r => { if (s[r.bdr_user_id]) s[r.bdr_user_id].dials++; });
      outcomes.forEach(r => {
        const x = s[r.bdr_user_id]; if (!x) return;
        x.outcomes++; if (BOOKED_OUTCOMES.has(r.outcome)) x.booked++;
      });
      events.forEach(r => {
        const x = s[r.user_id]; if (!x) return;
        x.meetings++; if (r.attendance === "attended") x.attended++;
      });

      if (cancelled) return;
      setMembers(roster);
      setStats(s);
      setSummary({
        team: roster.length,
        leads: leadsCount.count || 0,
        meetings: ids.length ? meetingsCount.count || 0 : 0,
        converted: convertedCount.count || 0,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-white/50 text-sm">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading team &amp; leads…
      </div>
    );
  }

  const th = "text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-white/35 font-semibold whitespace-nowrap";
  const td = "px-4 py-2.5 text-sm text-white/80 whitespace-nowrap";
  const empty = <p className="text-sm text-white/40 p-5">No team members in this workspace yet.</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Team Members", summary.team],
          ["Total Leads", summary.leads],
          ["Meetings Booked", summary.meetings],
          ["Leads → Deals", summary.converted],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl p-4" style={cardStyle}>
            <p className="text-[10px] uppercase tracking-wider text-white/35 font-semibold">{label}</p>
            <p className="text-xl font-bold text-white mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <p className="text-[10px] uppercase tracking-wider text-white/35 font-semibold px-4 pt-4 pb-2">Team Roster</p>
        {members.length === 0 ? empty : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-white/[0.06]"><th className={th}>Name</th><th className={th}>Role</th><th className={th}>Status</th></tr></thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={m.user_id || i} className="border-b border-white/[0.04]">
                    <td className={td}>{m.full_name || "—"}</td>
                    <td className={td}>{m.job_title || m.employee_role || "—"}</td>
                    <td className={td}><span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/5 text-white/60">{m.status || "—"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <p className="text-[10px] uppercase tracking-wider text-white/35 font-semibold px-4 pt-4 pb-2">Rep Performance</p>
        {members.length === 0 ? empty : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-white/[0.06]">
                {["Rep", "Leads Owned", "Dials", "Scheduled/Won / Outcomes", "Meetings Booked", "Attended"].map(h => <th key={h} className={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {members.map((m, i) => {
                  const s = (m.user_id && stats[m.user_id]) || { leads: 0, dials: 0, outcomes: 0, booked: 0, meetings: 0, attended: 0 };
                  return (
                    <tr key={m.user_id || i} className="border-b border-white/[0.04]">
                      <td className={td}>{m.full_name || "—"}</td>
                      <td className={td}>{s.leads}</td>
                      <td className={td}>{s.dials}</td>
                      <td className={td}><span className="text-emerald-400">{s.booked}</span><span className="text-white/40 text-xs ml-1">/ {s.outcomes}</span></td>
                      <td className={td}>{s.meetings}</td>
                      <td className={td}>{s.attended}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
