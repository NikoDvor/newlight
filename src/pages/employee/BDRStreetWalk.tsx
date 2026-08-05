import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, MapPin, Navigation, SkipForward, Check, ChevronRight, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { logDialerEvent } from "@/lib/bdrCalendar";
import { resolveEmployeeClientId } from "@/hooks/useEmployeeClientId";
import { stripLeadFlags, getLeadPhones } from "@/lib/leadFlags";
import { OUTCOMES, stageForOutcome } from "@/lib/bdrOutcomes";


interface WalkLead {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  front_desk_phone: string | null;
  owner_direct_phone: string | null;
  city: string | null;
  niche: string | null;
  website: string | null;
  list_name: string | null;
  notes: string | null;
  called: boolean | null;
  pipeline_stage: string | null;
  street_address: string | null;
  street_number: number | null;
  side_of_street: string | null;
  sequence_order: number | null;
  latitude: number | null;
  longitude: number | null;
  visit_status: string | null;
  source_type: string | null;
  has_booking_system: boolean | null;
  booking_system_exists: boolean | null;
  booking_platform: string | null;
  booking_system_platform: string | null;
  booking_system_methods: string[] | null;
  booking_system_checked_at: string | null;
  booking_link: string | null;
  booking_link_is_owner: boolean | null;
  owner_calendar_confirmed: boolean | null;
  owner_booking_link: string | null;
  owner_booking_link_send_ready: string | null;
  self_booking_widget_non_owner: boolean | null;
  dialer_bookable: boolean | null;
}


const ARRIVAL_METERS = 40;

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function statusTone(status: string | null) {
  if (status === "visited") return { bg: "hsla(142,72%,42%,.15)", color: "hsl(142,72%,55%)", label: "Visited" };
  if (status === "skipped") return { bg: "hsla(0,0%,50%,.15)", color: "hsl(0,0%,68%)", label: "Skipped" };
  return { bg: "hsla(211,96%,56%,.12)", color: "hsl(211,96%,70%)", label: "Pending" };
}

/* Same save-on-blur-if-changed pattern as the Dialer's NotesCell, sized for a dense table row. */
function NotesCell({ initial, onSave }: { initial: string; onSave: (v: string) => void | Promise<void> }) {
  const [value, setValue] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  useEffect(() => { setValue(initial); setBaseline(initial); }, [initial]);
  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={async () => {
        if (value === baseline) return;
        await onSave(value);
        setBaseline(value);
      }}
      placeholder="Add notes…"
      rows={2}
      className="w-[220px] bg-transparent text-white text-[11px] px-1.5 py-1 rounded border border-white/10 hover:border-white/20 focus:border-[hsl(211,96%,56%)] focus:outline-none resize-y min-h-[38px] leading-snug"
      style={{ background: value ? "hsla(211,96%,56%,.06)" : "hsla(0,0%,100%,.02)" }}
    />
  );
}

export default function BDRStreetWalk() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const listParam = searchParams.get("list");

  const [leads, setLeads] = useState<WalkLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [activeList, setActiveList] = useState<string | null>(listParam);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [outcomeLead, setOutcomeLead] = useState<WalkLead | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "watching" | "denied" | "unavailable">("idle");
  const watchIdRef = useRef<number | null>(null);

  /* ─── Load sequenced leads ─── */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      setClientId(await resolveEmployeeClientId(user.id));
      const { data } = await (supabase as any)
        .from("nl_bdr_leads")
        .select("id, business_name, owner_name, phone, front_desk_phone, owner_direct_phone, city, niche, website, list_name, notes, called, pipeline_stage, street_address, street_number, side_of_street, sequence_order, latitude, longitude, visit_status, source_type, has_booking_system, booking_system_exists, booking_platform, booking_system_platform, booking_system_methods, booking_system_checked_at, booking_link, booking_link_is_owner, owner_calendar_confirmed, owner_booking_link, owner_booking_link_send_ready, self_booking_widget_non_owner, dialer_bookable")
        .eq("user_id", user.id)
        .not("sequence_order", "is", null)
        .order("sequence_order", { ascending: true });
      setLeads((data || []) as WalkLead[]);
      setLoading(false);
    })();
  }, []);

  const lists = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach(l => {
      const name = l.list_name || "Uncategorized";
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [leads]);

  // Auto-pick the only list when none is specified.
  useEffect(() => {
    if (!activeList && lists.length === 1) setActiveList(lists[0][0]);
  }, [lists, activeList]);

  const walkLeads = useMemo(() => {
    if (!activeList) return [];
    return leads
      .filter(l => (l.list_name || "Uncategorized") === activeList)
      .sort((a, b) => (a.sequence_order ?? 1e9) - (b.sequence_order ?? 1e9));
  }, [leads, activeList]);

  const currentStop = useMemo(
    () => walkLeads.find(l => !l.visit_status || l.visit_status === "pending") || null,
    [walkLeads],
  );

  const visitedCount = useMemo(
    () => walkLeads.filter(l => l.visit_status === "visited" || l.visit_status === "skipped").length,
    [walkLeads],
  );

  /* ─── Geolocation watch (foreground only) ─── */
  const startWatch = useCallback(() => {
    if (!("geolocation" in navigator)) { setGeoState("unavailable"); return; }
    if (watchIdRef.current != null) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoState("watching");
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
      },
      (err) => {
        setGeoState(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    watchIdRef.current = id;
  }, []);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    startWatch();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stopWatch();
      else startWatch();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stopWatch();
    };
  }, [startWatch, stopWatch]);

  const distanceToCurrent = useMemo(() => {
    if (!position || !currentStop || currentStop.latitude == null || currentStop.longitude == null) return null;
    return haversineMeters(position.lat, position.lng, Number(currentStop.latitude), Number(currentStop.longitude));
  }, [position, currentStop]);

  const arrived = distanceToCurrent != null && distanceToCurrent <= ARRIVAL_METERS;

  /* ─── Mutations ─── */
  const setVisitStatus = useCallback(async (lead: WalkLead, status: "visited" | "skipped" | "pending") => {
    if (!userId) return;
    const prev = lead.visit_status;
    setLeads(p => p.map(l => l.id === lead.id ? { ...l, visit_status: status } : l));
    const { error } = await (supabase as any).from("nl_bdr_leads")
      .update({ visit_status: status }).eq("id", lead.id).eq("user_id", userId);
    if (error) {
      setLeads(p => p.map(l => l.id === lead.id ? { ...l, visit_status: prev } : l));
      toast({ title: "Couldn't update stop", description: error.message, variant: "destructive" });
    }
  }, [userId]);

  const logOutcome = useCallback(async (lead: WalkLead, label: string) => {
    if (!userId) return;
    const def = OUTCOMES.find(o => o.label === label);
    if (!def) return;
    setSavingId(lead.id);
    try {
      const { error } = await (supabase as any).from("bdr_call_outcomes").insert({
        bdr_user_id: userId,
        client_id: clientId,
        lead_id: lead.id,
        outcome: def.label,
        objection_type: def.objection,
      });
      if (error) throw error;
      const pipelineStage = stageForOutcome(def.label, lead.pipeline_stage);
      setLeads(p => p.map(l => l.id === lead.id
        ? { ...l, visit_status: "visited", called: true, pipeline_stage: pipelineStage }
        : l));
      await (supabase as any).from("nl_bdr_leads")
        .update({ pipeline_stage: pipelineStage, called: true, visit_status: "visited" })
        .eq("id", lead.id).eq("user_id", userId);
      logDialerEvent({
        leadId: lead.id,
        businessName: lead.business_name,
        ownerName: lead.owner_name,
        outcome: def.label,
        stage: pipelineStage,
        notes: lead.notes,
      }).catch(() => {});
      toast({ title: "Outcome logged", description: `${lead.business_name} marked visited.` });
      setOutcomeLead(null);
    } catch (e: any) {
      toast({ title: "Failed to log outcome", description: e.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  }, [userId, clientId]);

  /* ─── Render ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (!leads.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Street Walk</h1>
        <Card className="border-0 bg-white/[0.04]">
          <CardContent className="p-8 text-center">
            <p className="text-white/50 text-sm">No sequenced street-sweep leads yet. Import a street list and geocode it from My Leads first.</p>
            <Button className="mt-4" onClick={() => navigate("/employee/leads")}>Go to My Leads</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Street Walk</h1>
          <p className="text-xs text-white/50 mt-1">
            {activeList ? `"${activeList}" · ${visitedCount} of ${walkLeads.length} visited` : "Pick a sweep list to start walking"}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="text-white/60" onClick={() => navigate("/employee/leads")}>
          My Leads <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* List picker */}
      <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto -mx-1 px-1 pb-1"
        style={{ WebkitOverflowScrolling: "touch", overscrollBehaviorX: "contain" }}>
        {lists.map(([name, count]) => (
          <button key={name}
            onClick={() => { setActiveList(name); setSearchParams({ list: name }); }}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
            style={{
              background: activeList === name ? "hsla(211,96%,56%,.15)" : "hsla(215,35%,10%,.6)",
              color: activeList === name ? "hsl(211,96%,72%)" : "hsl(0,0%,70%)",
              border: `1px solid ${activeList === name ? "hsla(211,96%,56%,.4)" : "hsla(211,96%,60%,.12)"}`,
            }}>
            {name} <span className="opacity-60 ml-1">{count}</span>
          </button>
        ))}
      </div>

      {!activeList ? (
        <Card className="border-0 bg-white/[0.04]">
          <CardContent className="p-8 text-center text-sm text-white/50">Select a list above to begin.</CardContent>
        </Card>
      ) : (
        <>
          {/* Slim arrival banner */}
          {arrived && currentStop && (
            <div className="rounded-md px-3 py-1.5 text-xs font-semibold flex items-center gap-2"
              style={{ background: "hsla(142,72%,42%,.16)", color: "hsl(142,72%,62%)", border: "1px solid hsla(142,72%,42%,.45)" }}>
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              You've arrived at {currentStop.business_name}
            </div>
          )}

          {/* Spreadsheet */}
          {walkLeads.length === 0 ? (
            <Card className="border-0 bg-white/[0.04]">
              <CardContent className="p-6 text-center text-sm text-white/50">No sequenced leads in this list.</CardContent>
            </Card>
          ) : (
            <>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Scroll for more →</p>
            <div className="relative rounded-lg overflow-hidden" style={{ border: "1px solid hsla(211,96%,60%,.16)" }}>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 z-20"
                style={{ background: "linear-gradient(to left, hsla(215,40%,6%,.95), transparent)" }} />
              <div className="max-h-[70vh] overflow-auto" style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x pan-y", overscrollBehaviorX: "contain" }}>
                <table className="nl-native-table w-full min-w-[1100px] border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-20">
                    <tr>
                      {["#", "Address", "Business", "Owner", "Phone", "Website", "Niche", "Notes", "Status", "Action"].map((h, i) => (
                        <th key={h}
                          className={`px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-white/55 whitespace-nowrap ${i === 0 ? "w-10" : ""}`}
                          style={{
                            background: "hsl(215,35%,12%)",
                            borderBottom: "1px solid hsla(211,96%,60%,.25)",
                            borderRight: i < 9 ? "1px solid hsla(211,96%,60%,.10)" : undefined,
                          }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {walkLeads.map((lead, idx) => {
                      const tone = statusTone(lead.visit_status);
                      const isCurrent = currentStop?.id === lead.id;
                      const rowBg = isCurrent
                        ? "hsl(213,42%,18%)"
                        : idx % 2 === 0 ? "hsl(215,35%,8%)" : "hsl(215,35%,11%)";
                      const cell = "px-2 py-1.5 align-middle";
                      const cellStyle = { borderBottom: "1px solid hsla(211,96%,60%,.10)", borderRight: "1px solid hsla(211,96%,60%,.08)" };
                      const phone = lead.front_desk_phone || lead.phone || lead.owner_direct_phone || null;
                      return (
                        <tr key={lead.id} style={{ background: rowBg }} className="hover:brightness-125 transition-[filter]">
                          <td className={`${cell} font-mono tabular-nums text-white/45`} style={cellStyle}>{lead.sequence_order}</td>
                          <td className={`${cell} text-white/70`} style={cellStyle}>
                            <span className="block max-w-[180px] truncate" title={lead.street_address || undefined}>
                              {lead.street_address || "—"}
                            </span>
                          </td>
                          <td className={cell} style={cellStyle}>
                            <span className={`block max-w-[200px] truncate ${isCurrent ? "text-white font-semibold" : "text-white/85"}`}
                              title={lead.business_name}>
                              {lead.business_name}
                            </span>
                          </td>
                          <td className={`${cell} text-white/70`} style={cellStyle}>
                            <span className="block max-w-[140px] truncate" title={lead.owner_name || undefined}>
                              {lead.owner_name || "—"}
                            </span>
                          </td>
                          <td className={`${cell} text-white/70 whitespace-nowrap`} style={cellStyle}>
                            {phone ? (
                              <a href={`tel:${phone}`} className="tabular-nums hover:underline" title={phone}>{phone}</a>
                            ) : "—"}
                          </td>
                          <td className={`${cell} text-white/70`} style={cellStyle}>
                            {lead.website ? (
                              <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                                target="_blank" rel="noopener noreferrer"
                                className="block max-w-[150px] truncate hover:underline" title={lead.website}
                                style={{ color: "hsl(211,96%,72%)" }}>
                                {lead.website.replace(/^https?:\/\//, "")}
                              </a>
                            ) : "—"}
                          </td>
                          <td className={`${cell} text-white/70`} style={cellStyle}>
                            <span className="block max-w-[120px] truncate" title={lead.niche || undefined}>
                              {lead.niche || "—"}
                            </span>
                          </td>
                          <td className={`${cell} text-white/60`} style={cellStyle}>
                            <span className="block max-w-[220px] truncate" title={lead.notes || undefined}>
                              {lead.notes || "—"}
                            </span>
                          </td>
                          <td className={cell} style={cellStyle}>
                            <span className="inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap"
                              style={{ background: tone.bg, color: tone.color }}>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.color }} />
                              {tone.label}
                            </span>
                            {isCurrent && distanceToCurrent != null && (
                              <span className="ml-1.5 text-[10px] font-medium whitespace-nowrap" style={{ color: "hsl(190,90%,70%)" }}>
                                ~{Math.round(distanceToCurrent)} m
                              </span>
                            )}
                          </td>
                          <td className={`${cell} whitespace-nowrap`} style={{ borderBottom: "1px solid hsla(211,96%,60%,.10)" }}>
                            <div className="flex items-center gap-1">
                              <button type="button" title="Log outcome" aria-label="Log outcome"
                                disabled={savingId === lead.id}
                                onClick={() => setOutcomeLead(lead)}
                                className="h-6 px-1.5 rounded text-[10px] font-semibold text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-40">
                                Log
                              </button>
                              <button type="button" title="Mark visited" aria-label="Mark visited"
                                onClick={() => setVisitStatus(lead, "visited")}
                                className="h-6 w-6 grid place-items-center rounded text-white/60 hover:text-white hover:bg-white/10">
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" title="Skip stop" aria-label="Skip stop"
                                onClick={() => setVisitStatus(lead, "skipped")}
                                className="h-6 w-6 grid place-items-center rounded text-white/60 hover:text-white hover:bg-white/10">
                                <SkipForward className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </>
          )}

          {!currentStop && walkLeads.length > 0 && (
            <p className="text-xs text-white/55">Every stop on "{activeList}" is done. Nice work.</p>
          )}

          {/* GPS honesty note */}
          <p className="text-[11px] text-white/40 flex items-center gap-1.5">
            <Navigation className="h-3 w-3 shrink-0" />
            GPS shows an estimate only — always trust what you see in person.
            {geoState === "denied" && " Location is off, so manual controls only."}
          </p>
        </>
      )}


      {/* Outcome sheet */}
      <Dialog open={!!outcomeLead} onOpenChange={(o) => !o && setOutcomeLead(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{outcomeLead?.business_name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto">
            {OUTCOMES.map(o => (
              <Button key={o.label} variant="outline" size="sm"
                className="justify-start text-xs h-auto py-2 whitespace-normal text-left"
                disabled={!!savingId}
                onClick={() => outcomeLead && logOutcome(outcomeLead, o.label)}>
                {o.label}
              </Button>
            ))}
          </div>
          {outcomeLead && (
            <Button variant="ghost" size="sm" className="text-white/60"
              onClick={() => { setVisitStatus(outcomeLead, "skipped"); setOutcomeLead(null); }}>
              <SkipForward className="h-3.5 w-3.5 mr-1" /> Skip this stop instead
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
