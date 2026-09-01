import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Link2, Copy, Check, Search,
  Calendar as CalendarIcon, ChevronDown,
} from "lucide-react";

const OPS_CLIENT_ID = "00000000-0000-0000-0000-0000000000ff";

interface BookingLink {
  label: string;
  path: string;
}

interface UnifiedCalendar {
  key: string;
  id: string;
  source: "bdr" | "generic";
  ownerName: string;
  calendarName: string;
  typeLabel: string;
  typeClass: string;
  contextLabel?: string;
  total: number;
  upcoming: number;
  active: boolean;
  links: BookingLink[];
  note?: string;
}

interface BookingRow {
  id: string;
  start: string;
  name: string;
}


const TYPE_STYLES: Record<string, string> = {
  bdr: "bg-[hsl(211,96%,56%)]/15 border-[hsl(211,96%,60%)]/30 text-[hsl(211,96%,80%)]",
  staff: "bg-emerald-500/15 border-emerald-400/30 text-emerald-300",
  service_poc: "bg-violet-500/15 border-violet-400/30 text-violet-300",
  booking: "bg-amber-500/15 border-amber-400/30 text-amber-300",
  team: "bg-sky-500/15 border-sky-400/30 text-sky-300",
};

function typeLabelFor(t: string) {
  if (t === "service_poc") return "Service POC";
  return t
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function AdminAllCalendars() {
  const [items, setItems] = useState<UnifiedCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [bookings, setBookings] = useState<Record<string, BookingRow[]>>({});
  const [bookingsLoading, setBookingsLoading] = useState<Record<string, boolean>>({});

  const loadBookings = async (c: UnifiedCalendar) => {
    if (bookings[c.key] || bookingsLoading[c.key]) return;
    setBookingsLoading((p) => ({ ...p, [c.key]: true }));
    const nowIso = new Date().toISOString();
    const endIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    let rows: BookingRow[] = [];
    try {
      if (c.source === "bdr") {
        const { data } = await (supabase as any)
          .from("bdr_calendar_events")
          .select("id, starts_at, title, lead_id")
          .eq("calendar_id", c.id)
          .gte("starts_at", nowIso)
          .lte("starts_at", endIso)
          .order("starts_at");
        const evts = (data || []) as any[];
        const leadIds = [...new Set(evts.map((e) => e.lead_id).filter(Boolean))];
        const leadMap: Record<string, string> = {};
        if (leadIds.length) {
          const { data: leads } = await (supabase as any)
            .from("nl_bdr_leads")
            .select("id, business_name")
            .in("id", leadIds);
          (leads || []).forEach((l: any) => { if (l.business_name) leadMap[l.id] = l.business_name; });
        }
        rows = evts.map((e) => ({
          id: e.id,
          start: e.starts_at,
          name: (e.lead_id && leadMap[e.lead_id]) || e.title || "Untitled booking",
        }));
      } else {
        const { data } = await (supabase as any)
          .from("calendar_events")
          .select("id, start_time, title, contact_name")
          .eq("calendar_id", c.id)
          .gte("start_time", nowIso)
          .lte("start_time", endIso)
          .order("start_time");
        rows = ((data || []) as any[]).map((e) => ({
          id: e.id,
          start: e.start_time,
          name: e.contact_name || e.title || "Untitled booking",
        }));
      }
    } catch {
      rows = [];
    }
    setBookings((p) => ({ ...p, [c.key]: rows }));
    setBookingsLoading((p) => ({ ...p, [c.key]: false }));
  };


  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [bdrRes, genRes, bdrEvtRes, evtRes, linkRes] = await Promise.all([
        (supabase as any)
          .from("bdr_calendars")
          .select("id, user_id, name, booking_slug, booking_active")
          .order("name"),
        (supabase as any)
          .from("calendars")
          .select("id, calendar_name, calendar_type, owner_user_id, client_id, is_active")
          .order("calendar_name"),
        (supabase as any).from("bdr_calendar_events").select("calendar_id, starts_at"),
        (supabase as any).from("calendar_events").select("calendar_id, start_time"),
        (supabase as any).from("calendar_booking_links").select("calendar_id, slug, is_active"),
      ]);

      const bdrCals = (bdrRes.data || []) as any[];
      const genCals = (genRes.data || []) as any[];
      const now = Date.now();

      const countFrom = (rows: any[], field: string) => {
        const map: Record<string, { total: number; upcoming: number }> = {};
        (rows || []).forEach((e: any) => {
          const slot = map[e.calendar_id] || { total: 0, upcoming: 0 };
          slot.total += 1;
          if (e[field] && new Date(e[field]).getTime() > now) slot.upcoming += 1;
          map[e.calendar_id] = slot;
        });
        return map;
      };
      const bdrCounts = countFrom(bdrEvtRes.data || [], "starts_at");
      const genCounts = countFrom(evtRes.data || [], "start_time");

      // Owner names
      const bdrUserIds = [...new Set(bdrCals.map((c) => c.user_id).filter(Boolean))];
      const genUserIds = [...new Set(genCals.map((c) => c.owner_user_id).filter(Boolean))];
      const allUserIds = [...new Set([...bdrUserIds, ...genUserIds])];
      const nameMap: Record<string, string> = {};
      if (allUserIds.length) {
        const [wuRes, epRes] = await Promise.all([
          supabase.from("workspace_users").select("user_id, display_name").in("user_id", allUserIds),
          (supabase as any).from("employee_profiles").select("user_id, full_name").in("user_id", allUserIds),
        ]);
        (epRes.data || []).forEach((u: any) => { if (u.full_name) nameMap[u.user_id] = u.full_name; });
        (wuRes.data || []).forEach((u: any) => { if (u.display_name) nameMap[u.user_id] = u.display_name; });
      }

      // Client business names
      const clientIds = [...new Set(genCals.map((c) => c.client_id).filter((id) => id && id !== OPS_CLIENT_ID))];
      const clientMap: Record<string, string> = {};
      if (clientIds.length) {
        const { data } = await supabase.from("clients").select("id, business_name").in("id", clientIds as string[]);
        (data || []).forEach((c: any) => { clientMap[c.id] = c.business_name; });
      }

      const linksByCal: Record<string, string[]> = {};
      (linkRes.data || []).forEach((l: any) => {
        if (!l.slug) return;
        linksByCal[l.calendar_id] = [...(linksByCal[l.calendar_id] || []), l.slug];
      });

      const unified: UnifiedCalendar[] = [
        ...bdrCals.map((c) => {
          const ct = bdrCounts[c.id] || { total: 0, upcoming: 0 };
          return {
            key: `bdr-${c.id}`,
            id: c.id,
            source: "bdr" as const,
            ownerName: nameMap[c.user_id] || "Unassigned",
            calendarName: c.name,
            typeLabel: "Salesmen Pipeline",

            typeClass: TYPE_STYLES.bdr,
            total: ct.total,
            upcoming: ct.upcoming,
            active: !!c.booking_active,
            links: c.booking_slug
              ? [{ label: "Discovery Booking (Form 1)", path: `/bdr/book/${c.booking_slug}` }]
              : [],
            note: "Also receives: Close Prep closing meetings, Pay & Sign onboarding meetings",
          } as UnifiedCalendar;
        }),
        ...genCals.map((c) => {
          const ct = genCounts[c.id] || { total: 0, upcoming: 0 };
          const type = c.calendar_type || "other";
          return {
            key: `cal-${c.id}`,
            id: c.id,
            source: "generic" as const,
            ownerName: (c.owner_user_id && nameMap[c.owner_user_id]) || "Unassigned",

            calendarName: c.calendar_name,
            typeLabel: typeLabelFor(type),
            typeClass: TYPE_STYLES[type] || "bg-white/10 border-white/20 text-white/70",
            contextLabel: c.client_id && c.client_id !== OPS_CLIENT_ID ? clientMap[c.client_id] : undefined,
            total: ct.total,
            upcoming: ct.upcoming,
            active: c.is_active !== false,
            links: (linksByCal[c.id] || []).map((slug) => ({ label: "Booking Link", path: `/book/${slug}` })),
          } as UnifiedCalendar;
        }),
      ];

      setItems(unified);
      setLoading(false);
    };
    load();
  }, []);

  const copyLink = (path: string) => {
    navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(path);
    setTimeout(() => setCopied(null), 1500);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.ownerName.toLowerCase().includes(q) ||
        i.calendarName?.toLowerCase().includes(q) ||
        (i.contextLabel || "").toLowerCase().includes(q),
    );
  }, [items, query]);

  if (loading)
    return (
      <div className="min-h-[60vh] grid place-items-center text-white/60">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="p-6 space-y-6 text-white">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">All Calendars</h1>
        <p className="text-sm text-white/60">
          Every calendar in the system — BDR pipeline, staff, service POC, team and booking calendars — with all public booking forms.
        </p>
      </header>

      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by owner, calendar or client…"
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[hsl(211,96%,60%)]/50"
        />
      </div>

      <div className="text-xs text-white/40">{filtered.length} calendar{filtered.length === 1 ? "" : "s"}</div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-10 text-center text-white/40 text-sm">
            No calendars match your filter.
          </div>
        )}

        {filtered.map((c) => {
          const open = !!expanded[c.key];
          return (
            <div key={c.key} className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="p-4 flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{c.ownerName}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${c.typeClass}`}>{c.typeLabel}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${c.active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/40"}`}>
                      {c.active ? "Live" : "Paused"}
                    </span>
                  </div>
                  <div className="text-xs text-white/50 mt-1 truncate">
                    {c.calendarName}
                    {c.contextLabel && <span className="text-white/35"> · {c.contextLabel}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs shrink-0">
                  <span className="text-white/70">
                    <CalendarIcon className="h-3 w-3 inline mr-1" />
                    {c.total} total
                  </span>
                  <span className="text-[hsl(211,96%,70%)]">{c.upcoming} upcoming</span>
                </div>

                <button
                  onClick={() => setExpanded((p) => ({ ...p, [c.key]: !p[c.key] }))}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white transition-colors shrink-0"
                >
                  Forms & Links
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
              </div>

              {open && (
                <div className="border-t border-white/[0.06] px-4 py-3 space-y-2 bg-white/[0.015]">
                  {c.links.length === 0 ? (
                    <p className="text-xs text-white/40">No public booking link configured yet.</p>
                  ) : (
                    c.links.map((l) => (
                      <div key={l.path} className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-white/50 w-52 shrink-0">{l.label}</span>
                        <button
                          onClick={() => copyLink(l.path)}
                          className="inline-flex items-center gap-1.5 text-xs font-mono text-white/70 hover:text-white"
                        >
                          <Link2 className="h-3 w-3" />
                          {l.path}
                          {copied === l.path ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3 opacity-60" />
                          )}
                        </button>
                      </div>
                    ))
                  )}
                  {c.note && <p className="text-[11px] text-white/40 pt-1">{c.note}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
