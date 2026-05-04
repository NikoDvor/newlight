import { useEffect, useMemo, useState } from "react";
import { Download, ChevronDown, ChevronUp, BookOpen, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

/* ─── constants ─── */
const OBJECTION_CATEGORIES = [
  { key: "WALL", chapter: "5.1" }, { key: "AUTOPILOT", chapter: "5.2" }, { key: "STALL", chapter: "5.3" },
  { key: "VALUE_GAP", chapter: "5.4" }, { key: "COST", chapter: "5.5" }, { key: "TRUST_DEFICIT", chapter: "5.6" },
  { key: "STATUS_QUO", chapter: "5.7" }, { key: "PROOF_DEMAND", chapter: "5.8" }, { key: "STACKED", chapter: "5.9" },
];

const DATE_FILTERS = [
  { key: "today", label: "Today" }, { key: "week", label: "This Week" },
  { key: "month", label: "This Month" }, { key: "all", label: "All Time" },
];

const cardStyle = { background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" };

function filterByDate(dateStr: string, range: string) {
  const d = new Date(dateStr);
  const now = new Date();
  if (range === "all") return true;
  if (range === "today") return d.toDateString() === now.toDateString();
  if (range === "week") { const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0,0,0,0); return d >= s; }
  if (range === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return true;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ─── page ─── */
export default function AdminBDRPerformance() {
  const [leads, setLeads] = useState<any[]>([]);
  const [objections, setObjections] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("all");
  const [selectedBdr, setSelectedBdr] = useState<string | null>(null);
  const [selectedObjection, setSelectedObjection] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: l }, { data: o }] = await Promise.all([
        (supabase as any).from("nl_bdr_leads").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("nl_bdr_objections").select("*").order("created_at", { ascending: false }),
      ]);
      setLeads(l || []);
      setObjections(o || []);

      // Fetch BDR names
      const userIds = [...new Set([...(l || []).map((x: any) => x.user_id), ...(o || []).map((x: any) => x.user_id)])];
      if (userIds.length) {
        const { data: p } = await supabase.from("workspace_users").select("user_id, display_name").in("user_id", userIds);
        const map: Record<string, string> = {};
        (p || []).forEach((u: any) => { if (u.display_name) map[u.user_id] = u.display_name; });
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, []);

  const filteredLeads = useMemo(() => leads.filter(l => filterByDate(l.created_at, dateRange)), [leads, dateRange]);
  const filteredObjections = useMemo(() => objections.filter(o => filterByDate(o.created_at, dateRange)), [objections, dateRange]);

  const bdrIds = useMemo(() => [...new Set(leads.map(l => l.user_id))], [leads]);

  const teamStats = useMemo(() => {
    const total = filteredLeads.length;
    const booked = filteredLeads.filter(l => l.status === "appointment_booked").length;
    const won = filteredLeads.filter(l => l.status === "closed_won").length;
    return { total, booked, won, rate: total ? Math.round((booked / total) * 100) : 0, objections: filteredObjections.length };
  }, [filteredLeads, filteredObjections]);

  const bdrRows = useMemo(() => bdrIds.map(uid => {
    const bl = filteredLeads.filter(l => l.user_id === uid);
    const bo = filteredObjections.filter(o => o.user_id === uid);
    const contacted = bl.filter(l => l.status === "contacted").length;
    const booked = bl.filter(l => l.status === "appointment_booked").length;
    const won = bl.filter(l => l.status === "closed_won").length;
    const lost = bl.filter(l => l.status === "closed_lost").length;
    const objCounts: Record<string, number> = {};
    bo.forEach(o => { objCounts[o.objection_category] = (objCounts[o.objection_category] || 0) + 1; });
    const topObj = Object.entries(objCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    const allHistory = bl.flatMap((l: any) => (l.outcome_history || []).map((h: any) => h.timestamp)).filter(Boolean);
    const lastActive = allHistory.length ? allHistory.sort().reverse()[0] : bl[0]?.created_at;
    return { uid, name: profiles[uid] || uid.slice(0, 8), total: bl.length, contacted, booked, won, lost, rate: bl.length ? Math.round((booked / bl.length) * 100) : 0, topObj, lastActive };
  }).sort((a, b) => b.total - a.total), [bdrIds, filteredLeads, filteredObjections, profiles]);

  // Objection leaderboard
  const objLeaderboard = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0,0,0,0);
    const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    return OBJECTION_CATEGORIES.map(cat => {
      const all = filteredObjections.filter(o => o.objection_category === cat.key);
      const thisWeek = objections.filter(o => o.objection_category === cat.key && new Date(o.created_at) >= weekStart).length;
      const lastWeek = objections.filter(o => o.objection_category === cat.key && new Date(o.created_at) >= lastWeekStart && new Date(o.created_at) < weekStart).length;
      const bdrCounts: Record<string, number> = {};
      all.forEach(o => { bdrCounts[o.user_id] = (bdrCounts[o.user_id] || 0) + 1; });
      const topBdrs = Object.entries(bdrCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([uid, c]) => ({ name: profiles[uid] || uid.slice(0, 8), count: c }));
      return { ...cat, count: all.length, thisWeek, lastWeek, topBdrs };
    }).sort((a, b) => b.count - a.count);
  }, [filteredObjections, objections, profiles]);

  // Pipeline feed
  const pipelineFeed = useMemo(() => {
    const events: { text: string; time: string; color: string }[] = [];
    filteredLeads.forEach(l => {
      const history = (l.outcome_history || []) as any[];
      history.forEach((h: any) => {
        const name = profiles[l.user_id] || l.user_id?.slice(0, 8);
        const isBooked = /booked|won/i.test(h.label);
        const isClosed = /closed|wasn't|didn't|bad|business closed|wrong/i.test(h.label);
        events.push({
          text: `${name} logged "${h.label}" for ${l.business_name}`,
          time: h.timestamp,
          color: isBooked ? "hsl(142,72%,42%)" : isClosed ? "hsl(0,0%,60%)" : "hsl(38,92%,50%)",
        });
      });
    });
    return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 50);
  }, [filteredLeads, profiles]);

  // CSV export
  const exportCSV = () => {
    const rows = [["BDR", "Business", "Owner", "Phone", "Status", "Objection", "Created", "Outcome History"].join(",")];
    filteredLeads.forEach(l => {
      const history = (l.outcome_history || []).map((h: any) => `${h.label} (${new Date(h.timestamp).toLocaleDateString()})`).join("; ");
      rows.push([profiles[l.user_id] || l.user_id, l.business_name, l.owner_name || "", l.phone || "", l.status, l.objection_category || "", new Date(l.created_at).toLocaleDateString(), `"${history}"`].join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `bdr-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading BDR data...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">BDR Performance</h1>
          <p className="text-sm text-muted-foreground">Lead activity, outcomes, and objection data across all BDRs</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {DATE_FILTERS.map(f => (
            <button key={f.key} onClick={() => setDateRange(f.key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{ background: dateRange === f.key ? "hsl(211,96%,56%)" : "hsla(211,96%,60%,.08)", color: dateRange === f.key ? "#fff" : "hsl(211,96%,56%)" }}>
              {f.label}
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export</Button>
        </div>
      </div>

      {/* Team stats */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Total Leads", value: teamStats.total },
          { label: "Booked", value: teamStats.booked },
          { label: "Won", value: teamStats.won },
          { label: "Conv %", value: `${teamStats.rate}%` },
          { label: "Objections", value: teamStats.objections },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center" style={cardStyle}>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Per-BDR table */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3">Per-BDR Breakdown</h2>
        {bdrRows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No BDR activity yet.</p>
        ) : (
          <div className="space-y-1.5">
            {/* Header */}
            <div className="hidden sm:grid grid-cols-9 gap-2 px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wide">
              <span className="col-span-2">BDR</span><span>Leads</span><span>Contacted</span><span>Booked</span><span>Won</span><span>Lost</span><span>Conv %</span><span>Top Objection</span>
            </div>
            {bdrRows.map(row => (
              <button key={row.uid} onClick={() => setSelectedBdr(row.uid)}
                className="w-full text-left rounded-xl px-4 py-3 sm:grid sm:grid-cols-9 sm:gap-2 sm:items-center flex flex-col gap-1 transition-colors hover:bg-primary/5"
                style={cardStyle}>
                <span className="col-span-2 font-medium text-foreground truncate">{row.name}</span>
                <span className="text-sm text-foreground">{row.total}</span>
                <span className="text-sm text-foreground">{row.contacted}</span>
                <span className="text-sm text-foreground">{row.booked}</span>
                <span className="text-sm text-foreground">{row.won}</span>
                <span className="text-sm text-foreground">{row.lost}</span>
                <span className="text-sm text-foreground">{row.rate}%</span>
                <span className="text-xs text-muted-foreground truncate">{row.topObj.replace("_", " ")}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Objection leaderboard */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3">Team Objection Breakdown</h2>
        <div className="space-y-1.5">
          {objLeaderboard.filter(o => o.count > 0).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No objections logged yet.</p>
          ) : objLeaderboard.filter(o => o.count > 0).map(cat => (
            <button key={cat.key} onClick={() => setSelectedObjection(cat.key)}
              className="w-full text-left rounded-xl p-4 transition-colors hover:bg-primary/5" style={cardStyle}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-foreground">{cat.key.replace("_", " ")}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>This wk: {cat.thisWeek}</span><span>Last wk: {cat.lastWeek}</span>
                  <span className="font-bold text-foreground">{cat.count} total</span>
                </div>
              </div>
              {cat.topBdrs.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {cat.topBdrs.map(b => (
                    <span key={b.name} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "hsla(211,96%,56%,.1)", color: "hsl(211,96%,56%)" }}>
                      {b.name} ({b.count})
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline feed */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3">Pipeline Activity</h2>
        {pipelineFeed.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No pipeline activity yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {pipelineFeed.map((ev, i) => (
              <div key={i} className="rounded-xl px-4 py-3 flex items-start gap-3" style={cardStyle}>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: ev.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">{ev.text}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="h-2.5 w-2.5" />{timeAgo(ev.time)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BDR Detail Sheet */}
      <BdrDetailSheet uid={selectedBdr} leads={leads} objections={objections} profiles={profiles} onClose={() => setSelectedBdr(null)} />

      {/* Objection Detail Sheet */}
      <ObjectionDetailSheet category={selectedObjection} objections={objections} profiles={profiles} onClose={() => setSelectedObjection(null)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/* BDR Detail Sheet                                */
/* ═══════════════════════════════════════════════ */
function BdrDetailSheet({ uid, leads, objections, profiles, onClose }: { uid: string | null; leads: any[]; objections: any[]; profiles: Record<string, string>; onClose: () => void }) {
  const navigate = useNavigate();
  if (!uid) return null;
  const name = profiles[uid] || uid.slice(0, 8);
  const bl = leads.filter(l => l.user_id === uid);
  const bo = objections.filter(o => o.user_id === uid);
  const objCounts: Record<string, number> = {};
  bo.forEach(o => { objCounts[o.objection_category] = (objCounts[o.objection_category] || 0) + 1; });
  const statusCounts: Record<string, number> = {};
  bl.forEach(l => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });

  return (
    <Dialog open={!!uid} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>{bl.length} leads · {bo.length} objections logged</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Outcome breakdown */}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Outcome Breakdown</p>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(statusCounts).map(([s, c]) => (
                <div key={s} className="rounded-lg px-3 py-2 text-xs" style={cardStyle}>
                  <span className="text-foreground font-medium">{s.replace("_", " ")}</span>
                  <span className="float-right text-muted-foreground">{c}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Objection breakdown */}
          {bo.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Objection Breakdown</p>
              {OBJECTION_CATEGORIES.filter(cat => objCounts[cat.key]).map(cat => (
                <div key={cat.key} className="flex items-center justify-between rounded-lg px-3 py-2 mb-1" style={cardStyle}>
                  <span className="text-xs text-foreground">{cat.key.replace("_", " ")} ({objCounts[cat.key]})</span>
                  <button onClick={() => navigate("/admin/training-center/bdr")} className="text-[10px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-md"
                    style={{ color: "hsl(211,96%,56%)", background: "hsla(211,96%,56%,.08)" }}>
                    <BookOpen className="h-3 w-3" /> Ch {cat.chapter}
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Lead list */}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Lead List</p>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {bl.map((l: any) => (
                <div key={l.id} className="rounded-lg px-3 py-2 text-xs flex items-center justify-between" style={cardStyle}>
                  <div>
                    <span className="text-foreground font-medium">{l.business_name}</span>
                    {l.owner_name && <span className="text-muted-foreground ml-2">— {l.owner_name}</span>}
                  </div>
                  <span className="text-muted-foreground">{l.status.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════ */
/* Objection Detail Sheet                          */
/* ═══════════════════════════════════════════════ */
function ObjectionDetailSheet({ category, objections, profiles, onClose }: { category: string | null; objections: any[]; profiles: Record<string, string>; onClose: () => void }) {
  if (!category) return null;
  const filtered = objections.filter(o => o.objection_category === category);
  return (
    <Dialog open={!!category} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{category.replace("_", " ")}</DialogTitle>
          <DialogDescription>{filtered.length} logged across team</DialogDescription>
        </DialogHeader>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {filtered.map((o: any) => (
            <div key={o.id} className="rounded-lg px-3 py-2 text-xs" style={cardStyle}>
              <div className="flex items-center justify-between">
                <span className="text-foreground font-medium">{profiles[o.user_id] || o.user_id?.slice(0, 8)}</span>
                <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-muted-foreground mt-0.5">{o.business_name || "—"} · {o.outcome_logged || "—"}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
