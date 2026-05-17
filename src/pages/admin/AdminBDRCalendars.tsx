import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Link2, Users, Calendar as CalendarIcon, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BdrCal {
  id: string;
  user_id: string;
  name: string;
  booking_slug: string | null;
  booking_active: boolean;
  round_robin_pool: boolean;
  last_assigned_at: string | null;
  google_sync_enabled: boolean;
  outlook_sync_enabled: boolean;
}

export default function AdminBDRCalendars() {
  const [cals, setCals] = useState<BdrCal[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, { total: number; upcoming: number }>>({});
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: calRows } = await (supabase as any)
      .from("bdr_calendars")
      .select("id, user_id, name, booking_slug, booking_active, round_robin_pool, last_assigned_at, google_sync_enabled, outlook_sync_enabled")
      .order("name");
    const list = (calRows || []) as BdrCal[];
    setCals(list);

    const userIds = [...new Set(list.map((c) => c.user_id))];
    if (userIds.length) {
      const { data: wu } = await supabase
        .from("workspace_users")
        .select("user_id, display_name")
        .in("user_id", userIds);
      const map: Record<string, string> = {};
      (wu || []).forEach((u: any) => { if (u.display_name) map[u.user_id] = u.display_name; });
      setNames(map);
    }

    // Appointment counts per calendar
    const { data: evts } = await (supabase as any)
      .from("bdr_calendar_events")
      .select("calendar_id, starts_at");
    const cMap: Record<string, { total: number; upcoming: number }> = {};
    const now = Date.now();
    (evts || []).forEach((e: any) => {
      const slot = cMap[e.calendar_id] || { total: 0, upcoming: 0 };
      slot.total += 1;
      if (new Date(e.starts_at).getTime() > now) slot.upcoming += 1;
      cMap[e.calendar_id] = slot;
    });
    setCounts(cMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const togglePool = async (cal: BdrCal) => {
    const next = !cal.round_robin_pool;
    setCals((prev) => prev.map((c) => c.id === cal.id ? { ...c, round_robin_pool: next } : c));
    const { error } = await (supabase as any)
      .from("bdr_calendars")
      .update({ round_robin_pool: next })
      .eq("id", cal.id);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      setCals((prev) => prev.map((c) => c.id === cal.id ? { ...c, round_robin_pool: !next } : c));
    } else {
      toast({ title: next ? "Added to round-robin pool" : "Removed from pool" });
    }
  };

  const copyLink = (slug: string | null) => {
    if (!slug) return;
    const url = `${window.location.origin}/bdr/book/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 1500);
  };

  const pool = useMemo(() => cals.filter((c) => c.round_robin_pool && c.booking_active), [cals]);

  if (loading) return (
    <div className="min-h-[60vh] grid place-items-center text-white/60">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6 text-white">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">BDR Calendars</h1>
        <p className="text-sm text-white/60">Manage every BDR booking link, round-robin pool, and appointment activity.</p>
      </header>

      {/* Pool summary */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-[hsl(211,96%,60%)]" />
          <h2 className="font-medium">Active Round-Robin Pool</h2>
          <span className="ml-auto text-xs text-white/50">{pool.length} member{pool.length === 1 ? "" : "s"}</span>
        </div>
        {pool.length === 0 ? (
          <p className="text-sm text-white/50">No BDRs are currently in the round-robin pool.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pool.map((c) => (
              <span key={c.id} className="px-2.5 py-1 rounded-md text-xs bg-[hsl(211,96%,56%)]/15 border border-[hsl(211,96%,60%)]/30 text-white">
                {names[c.user_id] || c.name}
                {c.last_assigned_at && (
                  <span className="ml-1.5 text-white/50">· {new Date(c.last_assigned_at).toLocaleDateString()}</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Calendar list */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.04] text-white/60 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Owner / Calendar</th>
              <th className="text-left px-4 py-3">Booking link</th>
              <th className="text-center px-4 py-3">Active</th>
              <th className="text-center px-4 py-3">Round-Robin</th>
              <th className="text-right px-4 py-3">Appointments</th>
            </tr>
          </thead>
          <tbody>
            {cals.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-white/40">No BDR calendars yet.</td></tr>
            )}
            {cals.map((c) => {
              const ct = counts[c.id] || { total: 0, upcoming: 0 };
              const slug = c.booking_slug;
              return (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{names[c.user_id] || "Unknown BDR"}</div>
                    <div className="text-xs text-white/50">{c.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    {slug ? (
                      <button
                        onClick={() => copyLink(slug)}
                        className="inline-flex items-center gap-1.5 text-xs font-mono text-white/70 hover:text-white"
                      >
                        <Link2 className="h-3 w-3" />
                        /bdr/book/{slug}
                        {copied === slug ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 opacity-60" />}
                      </button>
                    ) : (
                      <span className="text-xs text-white/30">No link</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.booking_active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/40"}`}>
                      {c.booking_active ? "Live" : "Paused"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => togglePool(c)}
                      className={`h-5 w-9 rounded-full transition-colors relative ${c.round_robin_pool ? "bg-[hsl(211,96%,56%)]" : "bg-white/15"}`}
                      aria-label="Toggle round-robin"
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${c.round_robin_pool ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3 text-xs">
                      <span className="text-white/70"><CalendarIcon className="h-3 w-3 inline mr-1" />{ct.total} total</span>
                      <span className="text-[hsl(211,96%,70%)]">{ct.upcoming} upcoming</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
