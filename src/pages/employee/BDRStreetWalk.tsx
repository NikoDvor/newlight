import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, MapPin, Navigation, SkipForward, Check, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { logDialerEvent } from "@/lib/bdrCalendar";
import { resolveEmployeeClientId } from "@/hooks/useEmployeeClientId";
import { stripLeadFlags, getLeadPhones } from "@/lib/leadFlags";
import { OUTCOMES, stageForOutcome } from "@/lib/bdrOutcomes";
import { LeadOwner, LeadPhones, LeadWebsite, LeadMetaTags, LeadNotes, LeadBookingLinks, BookingSystemBadge } from "@/components/employee/LeadFields";

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
    <div className="space-y-4">
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

      {/* GPS honesty note */}
      <p className="text-[11px] text-white/40 flex items-center gap-1.5">
        <Navigation className="h-3 w-3 shrink-0" />
        GPS shows an estimate only — always trust what you see in person.
        {geoState === "denied" && " Location is off, so manual controls only."}
      </p>

      {!activeList ? (
        <Card className="border-0 bg-white/[0.04]">
          <CardContent className="p-8 text-center text-sm text-white/50">Select a list above to begin.</CardContent>
        </Card>
      ) : (
        <>
          {/* Current stop */}
          {currentStop ? (
            <div className="rounded-xl p-4"
              style={{
                background: arrived ? "hsla(142,72%,42%,.10)" : "hsla(215,35%,10%,.8)",
                border: `1px solid ${arrived ? "hsla(142,72%,42%,.55)" : "hsla(211,96%,60%,.25)"}`,
              }}>
              {arrived && (
                <div className="mb-3 rounded-lg px-3 py-2 text-sm font-semibold"
                  style={{ background: "hsla(142,72%,42%,.18)", color: "hsl(142,72%,62%)", border: "1px solid hsla(142,72%,42%,.45)" }}>
                  You've arrived at {currentStop.business_name}
                </div>
              )}
              <div className="min-w-0 space-y-2.5">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/45">Current stop #{currentStop.sequence_order}</p>
                  <h2 className="text-lg font-bold text-white break-words leading-snug">{currentStop.business_name}</h2>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <LeadMetaTags lead={currentStop} />
                  {distanceToCurrent != null && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ background: "hsla(190,90%,55%,.12)", color: "hsl(190,90%,70%)" }}>
                      ~{Math.round(distanceToCurrent)} m away
                    </span>
                  )}
                  <BookingSystemBadge lead={currentStop} />
                </div>

                <div className="text-xs">
                  <span className="text-white/40 mr-1">Owner:</span>
                  <LeadOwner lead={currentStop} className="inline-flex" />
                </div>

                <LeadPhones lead={currentStop} />
                <LeadWebsite lead={currentStop} />
                <LeadBookingLinks lead={currentStop} />
                <LeadNotes lead={currentStop} clamp />
              </div>


              <div className="flex flex-wrap gap-2 mt-4">
                <Button size="sm" onClick={() => setOutcomeLead(currentStop)} disabled={savingId === currentStop.id}>
                  Log outcome
                </Button>
                <Button size="sm" variant="outline" onClick={() => setVisitStatus(currentStop, "visited")}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Mark visited
                </Button>
                <Button size="sm" variant="outline" onClick={() => setVisitStatus(currentStop, "skipped")}>
                  <SkipForward className="h-3.5 w-3.5 mr-1" /> Skip
                </Button>
              </div>
            </div>
          ) : walkLeads.length > 0 ? (
            <Card className="border-0 bg-white/[0.04]">
              <CardContent className="p-6 text-center text-sm text-white/60">
                Every stop on "{activeList}" is done. Nice work.
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 bg-white/[0.04]">
              <CardContent className="p-6 text-center text-sm text-white/50">No sequenced leads in this list.</CardContent>
            </Card>
          )}

          {/* Full sequence */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsla(211,96%,60%,.12)", background: "hsla(215,35%,8%,.8)" }}>
            {walkLeads.map(lead => {
              const tone = statusTone(lead.visit_status);
              const isCurrent = currentStop?.id === lead.id;
              return (
                <button key={lead.id}
                  onClick={() => setOutcomeLead(lead)}
                  className="w-full text-left px-3 py-2.5 border-b border-white/5 last:border-b-0 hover:bg-white/[0.04] transition-colors flex items-center gap-3">
                  <span className="text-[11px] text-white/40 w-6 shrink-0">{lead.sequence_order}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm break-words leading-snug ${isCurrent ? "text-white font-semibold" : "text-white/80"}`}>
                      {lead.business_name}
                    </span>
                    {lead.street_address && (
                      <span className="block text-[11px] text-white/45 break-words">{lead.street_address}</span>
                    )}
                    <span className="mt-1 flex flex-wrap items-center gap-1">
                      <BookingSystemBadge lead={lead} showPlatform={false} />
                    </span>
                  </span>

                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0"
                    style={{ background: tone.bg, color: tone.color }}>{tone.label}</span>
                </button>
              );
            })}
          </div>
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
