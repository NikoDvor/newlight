import { useEffect, useState, useContext } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Calendar, Clock, FileText, Brain } from "lucide-react";
import { format, isFuture } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceContext } from "@/contexts/WorkspaceContext";

interface SalesMeeting {
  id: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  meeting_outcome: string | null;
  summary_notes: string | null;
  contact_id: string | null;
  deal_id: string | null;
}

interface MI {
  id: string;
  score: number | null;
  contact_id: string | null;
  deal_id: string | null;
}

export default function Meetings() {
  const { activeClientId } = useContext(WorkspaceContext);
  const [meetings, setMeetings] = useState<SalesMeeting[]>([]);
  const [intel, setIntel] = useState<MI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) { setLoading(false); return; }
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data: sm } = await supabase
        .from("sales_meetings")
        .select("id,title,start_time,end_time,status,meeting_outcome,summary_notes,contact_id,deal_id")
        .eq("client_id", activeClientId)
        .order("start_time", { ascending: false })
        .limit(200);
      const { data: mi } = await supabase
        .from("meeting_intelligence")
        .select("id,score,contact_id,deal_id")
        .eq("client_id", activeClientId);
      if (!mounted) return;
      setMeetings((sm ?? []) as SalesMeeting[]);
      setIntel((mi ?? []) as MI[]);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [activeClientId]);

  const now = Date.now();
  const upcoming = meetings
    .filter((m) => m.start_time && new Date(m.start_time).getTime() >= now)
    .sort((a, b) => new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime());
  const past = meetings
    .filter((m) => !m.start_time || new Date(m.start_time).getTime() < now);

  const scoreFor = (m: SalesMeeting): number | null => {
    const match = intel.find(
      (i) => (m.deal_id && i.deal_id === m.deal_id) || (m.contact_id && i.contact_id === m.contact_id)
    );
    return match?.score ?? null;
  };

  const monthCount = meetings.filter((m) => {
    if (!m.start_time) return false;
    const d = new Date(m.start_time);
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
  }).length;

  const withNotes = past.filter((m) => m.summary_notes && m.summary_notes.trim().length > 0).length;

  const scoredMeetings = past
    .map((m) => scoreFor(m))
    .filter((s): s is number => typeof s === "number");
  const avgScore = scoredMeetings.length
    ? Math.round(scoredMeetings.reduce((a, b) => a + b, 0) / scoredMeetings.length)
    : null;

  const durationOf = (m: SalesMeeting) => {
    if (!m.start_time || !m.end_time) return "—";
    const mins = Math.round((new Date(m.end_time).getTime() - new Date(m.start_time).getTime()) / 60000);
    return `${mins} min`;
  };

  const nextLabel = upcoming[0]?.start_time
    ? `Next: ${format(new Date(upcoming[0].start_time!), "MMM d, h:mm a")}`
    : "No meetings scheduled";

  return (
    <div>
      <PageHeader title="Meetings" description="Track meetings, notes, and AI-powered summaries" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Upcoming Meetings" value={String(upcoming.length)} change={nextLabel} changeType="neutral" icon={Calendar} />
        <MetricCard label="Meetings This Month" value={String(monthCount)} change="Actual count" changeType="neutral" icon={Clock} />
        <MetricCard label="Meeting Notes" value={String(withNotes)} change={`${withNotes} of ${past.length} past`} changeType="neutral" icon={FileText} />
        <MetricCard label="Avg Meeting Score" value={avgScore !== null ? String(avgScore) : "—"} change={avgScore !== null ? "From meeting intelligence" : "No scored meetings yet"} changeType="neutral" icon={Brain} />
      </WidgetGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DataCard title="Upcoming Meetings">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : upcoming.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming meetings scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 10).map((m) => (
                <div key={m.id} className="py-3 border-b border-border last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{m.title}</p>
                    <span className="text-xs text-muted-foreground">{durationOf(m)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {m.start_time ? format(new Date(m.start_time), "MMM d, h:mm a") : "—"} · {m.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DataCard>

        <DataCard title="Past Meetings">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : past.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No past meetings yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {past.slice(0, 10).map((m) => {
                const score = scoreFor(m);
                return (
                  <div key={m.id} className="py-3 border-b border-border last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{m.title}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {m.start_time ? format(new Date(m.start_time), "MMM d") : "—"}
                        </span>
                        {score !== null && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600">
                            {score}/100
                          </span>
                        )}
                      </div>
                    </div>
                    {m.summary_notes ? (
                      <div className="mt-2 p-3 rounded-lg bg-secondary">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Summary Notes</p>
                        <p className="text-sm whitespace-pre-wrap">{m.summary_notes}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">No notes recorded · {m.meeting_outcome ?? m.status}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DataCard>
      </div>
    </div>
  );
}
