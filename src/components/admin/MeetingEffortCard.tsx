import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { rangeStart, type RangeKey } from "@/components/insights/PipelineInsightsView";

/**
 * Meeting effort per salesman: how many meetings it takes to win (or lose) a
 * client, how many extra meetings get booked and of which type, and how long
 * from first meeting to Won. Backed by the nl_meeting_effort() database
 * function — admins see every salesman, a salesman sees only themselves, and
 * both see the team average.
 */
interface Row {
  rep_user_id: string | null;
  rep_name: string;
  meetings_held: number | null;
  extra_meetings: number | null;
  extra_by_type: Record<string, number> | null;
  won_clients: number | null;
  meetings_per_won: number | null;
  lost_leads: number | null;
  meetings_per_lost: number | null;
  avg_days_to_won: number | null;
}

const EXTRA_LABEL: Record<string, string> = {
  discovery_followup: "Discovery f/u",
  closing_followup: "Closing f/u",
  onboarding: "Onboarding",
  check_in: "Check-in",
};

const fmt = (n: number | null | undefined, suffix = "") => (n == null ? "—" : `${n}${suffix}`);

export default function MeetingEffortCard({ range, repUserId, title = "Meeting effort" }: { range: RangeKey; repUserId?: string; title?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase as any).rpc("nl_meeting_effort", {
        _since: rangeStart(range),
        _rep: repUserId || null,
      });
      if (cancelled) return;
      if (error) console.error("nl_meeting_effort failed", error);
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [range, repUserId]);

  const team = rows.find((r) => r.rep_user_id === null);
  const reps = rows.filter((r) => r.rep_user_id !== null);

  return (
    <Card className="border-0 bg-white/[0.03]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-white">{title}</CardTitle>
        <p className="text-xs text-white/45">
          Meetings it takes to win or lose a client, extra meetings booked, and days from first meeting to Won.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 text-center text-sm text-white/40">Loading…</div>
        ) : reps.length === 0 ? (
          <div className="py-6 text-center text-sm text-white/40">No meetings logged in this period yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-white/50">
                  <th className="py-2 pr-3 font-medium">Salesman</th>
                  <th className="py-2 pr-3 font-medium text-right">Meetings held</th>
                  <th className="py-2 pr-3 font-medium text-right">Won</th>
                  <th className="py-2 pr-3 font-medium text-right">Meetings per win</th>
                  <th className="py-2 pr-3 font-medium text-right">Lost</th>
                  <th className="py-2 pr-3 font-medium text-right">Meetings per loss</th>
                  <th className="py-2 pr-3 font-medium text-right">Days to Won</th>
                  <th className="py-2 pr-3 font-medium text-right">Extra meetings</th>
                  <th className="py-2 font-medium">Extra by type</th>
                </tr>
              </thead>
              <tbody>
                {[...reps, ...(team ? [team] : [])].map((r) => {
                  const isTeam = r.rep_user_id === null;
                  const types = Object.entries(r.extra_by_type || {}).sort((a, b) => b[1] - a[1]);
                  return (
                    <tr key={r.rep_user_id || "team"} className={`border-t border-white/5 ${isTeam ? "text-white/60 italic" : "text-white/85"}`}>
                      <td className="py-2 pr-3 whitespace-nowrap">{r.rep_name}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.meetings_held)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.won_clients)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums font-semibold">{fmt(r.meetings_per_won)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.lost_leads)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.meetings_per_lost)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.avg_days_to_won)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.extra_meetings)}</td>
                      <td className="py-2">
                        {isTeam ? "" : types.length === 0 ? <span className="text-white/30">—</span> : (
                          <span className="flex flex-wrap gap-1">
                            {types.map(([k, n]) => (
                              <span key={k} className="rounded-full px-1.5 py-0.5 bg-white/5 text-white/70">{EXTRA_LABEL[k] || k} {n}</span>
                            ))}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
