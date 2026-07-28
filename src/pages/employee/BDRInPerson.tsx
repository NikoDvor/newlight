import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2, MapPin, Plus, Trash2, Camera, Copy, CheckCircle2, LocateFixed, Pencil, X, ClipboardList, ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { resolveEmployeeClientId } from "@/hooks/useEmployeeClientId";
import { PageHeader } from "@/components/PageHeader";

export const STREET_SWEEP_RESEARCH_PROMPT = `STREET SWEEP DESK RESEARCH PROTOCOL v4

ROLE: You are doing desk research only — finding the owner name, phone number, and booking link for a list of businesses I supply. You do NOT have Street View or physical visual access. Never attempt a visual block-by-block pass, and never fabricate or guess any name, number, or link — if you cannot verify something through a real search, mark it "Research Pending" or "Not Found" instead.

INPUT: I will paste a list, one per line: Business Name | Address | (optional) niche.

BATCHING: process 5 businesses at a time. If given more than 5, output the results for the first 5, then immediately continue to the next 5 automatically — do not wait for me to say 'next' or 'continue.' Keep working straight through batch after batch until the entire list is done. Label each batch's output clearly (Batch 1, Batch 2, etc.).

For EACH business, work through these routes in order for EACH column, stopping a given column as soon as it's confidently resolved — but keep working the other columns even if one resolves early:

COLUMN 1 — OWNER NAME (try in order until resolved):
1. Search "who is the owner of [Business Name] in [City, State]"
2. Search "[Business Name] founder OR owner LinkedIn"
3. Check the city or county business license / fictitious business name (DBA) database for the address
4. Check Yelp's business page for an "owner response" or "About the Business" owner field
5. Search "[Business Name] [City] Secretary of State business entity search" for the registered agent/officer name
6. Search local press: "[Business Name] [City] news OR profile OR interview"
7. Check the local Chamber of Commerce member directory for the business
8. Check the Better Business Bureau listing for a listed owner/principal
If none of these resolve it, mark "Research Pending — owner not found" and move on. Never guess a name from a generic pattern.

COLUMN 2 — PHONE (try in order until resolved):
1. Use the primary number from the business's Google/Yelp listing
2. Check the business's own website contact/about page for a direct line
3. If multiple numbers exist, look for context clues distinguishing an owner's direct/cell line from a general front-desk or reception line
4. Label clearly: "owner direct" only if there's real evidence it reaches the owner personally — otherwise label "front desk / general," even if a single-location shop only has one number.

COLUMN 3 — BOOKING LINK (try in order until resolved):
1. Check the business website for a "Book Now" / "Schedule" / "Contact" link
2. Search "[Business Name] Vagaro OR Fresha OR Square OR Calendly OR Acuity"
3. If a booking system is found, determine whether it routes to one specific staff member's personal calendar (note their name) or a general/multi-staff booking page — label accordingly.
If no booking system is found, note "No online booking found."

OUTPUT FORMAT — one copy-pasteable block per batch (not a file), plain text table:
Business | Owner | Phone (label) | Booking Link (type) | Status

If any step would require seeing the physical storefront (signage, open/closed status, "check in person"), say so explicitly and mark it "needs in-person check" — never fake visual confidence.`;

export const STREET_DISCOVERY_PROMPT = `STREET DISCOVERY PROTOCOL v4

ROLE: You are finding every real business on a specific street so I can log them for a street sweep. Never fabricate a business name or address — every entry must come from a real search result.

INPUT: I will give you a street, city, and state.

DISCOVERY ROUTES — use whichever are available to you, in this priority order:
1. If you have a Google Maps/Places search tool in this chat, use it directly to pull real businesses and addresses on the given street — this is the most accurate method, prefer it whenever available.
2. If you do NOT have Places/Maps access, fall back to web search: search "[Street Name] [City] businesses" and "[Street Name] [City] shops OR restaurants OR services," and cross-reference the local Chamber of Commerce directory and city business license database for the same street.
3. Also check Yelp's category/street browse results and any local "best of [street]" blog roundups as a secondary cross-check — never treat these alone as sufficient without a primary source.
4. If a business's exact address isn't confirmed by at least one source, still include it but flag it "address unconfirmed."

WORK IN INCREMENTS OF 5: search and verify 5 businesses at a time, moving down the street in address order (low numbers to high, or however the street naturally orders). The moment you finish verifying 5, immediately continue searching for the next 5 further down the street — do not stop, do not wait for me to say 'next' or 'continue.' Keep going automatically until you've covered the entire street or run out of usable context.

OUTPUT FORMAT: Output ONE single continuous list, not separate labeled batches — do not print 'Batch 1' / 'Batch 2' headers or any dividers, since I'm going to copy this whole block and paste it directly into a bulk-add tool that reads one business per line. Just keep appending lines to the same list as you go:

BusinessName, Full Address

If you run out of context or need to stop before finishing the whole street, end with a plain note (not part of the list) telling me exactly how far you got by address range, so I know where to pick up.

If you have NO usable method to find real businesses on this street at all, say so plainly instead of guessing — never fabricate a business name or address to fill out the list.`;


interface Route {
  id: string;
  route_name: string;
  street_name: string;
  city: string;
  state: string;
  block_range: string | null;
  status: string;
  created_at: string;
}

interface Visit {
  id: string;
  route_id: string;
  business_name: string;
  address: string;
  unit_suite: string | null;
  lat: number | null;
  lng: number | null;
  storefront_status: string;
  has_signage: boolean | null;
  has_booking_qr: boolean | null;
  niche_guess: string | null;
  photo_url: string | null;
  notes: string | null;
  research_status: string;
  owner_name: string | null;
  owner_phone: string | null;
  website: string | null;
  booking_link_type: string | null;
  lead_id: string | null;
  visited_by: string;
  created_at: string;
  sequence: number | null;

}

/** Order visits by explicit sequence (paste/log order), falling back to created_at for legacy rows. */
export function orderVisits(a: Visit, b: Visit) {
  const as = a.sequence, bs = b.sequence;
  if (as != null && bs != null) return as - bs;
  if (as != null) return -1;
  if (bs != null) return 1;
  return a.created_at.localeCompare(b.created_at);
}

const STOREFRONT = ["open", "closed", "vacant", "unclear"] as const;

const emptyVisitForm = {
  business_name: "",
  address: "",
  unit_suite: "",
  storefront_status: "open" as string,
  has_signage: true,
  has_booking_qr: false,
  niche_guess: "",
  notes: "",
  lat: null as number | null,
  lng: null as number | null,
  photo_url: null as string | null,
};

function statusTone(s: string) {
  if (s === "open") return "bg-[hsl(142,72%,42%)]/15 text-[hsl(142,72%,42%)]";
  if (s === "closed") return "bg-amber-500/15 text-amber-400";
  if (s === "vacant") return "bg-destructive/15 text-destructive";
  return "bg-muted text-muted-foreground";
}

function PhotoThumb({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    supabase.storage.from("street-sweep-photos").createSignedUrl(path, 3600).then(({ data }) => {
      if (active) setUrl(data?.signedUrl ?? null);
    });
    return () => { active = false; };
  }, [path]);
  if (!url) return <div className="h-12 w-12 rounded-md bg-muted shrink-0" />;
  return <img src={url} alt="Storefront photo" className="h-12 w-12 rounded-md object-cover shrink-0 border border-border/60" />;
}

export default function BDRInPerson() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string>("");
  const [visits, setVisits] = useState<Visit[]>([]);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const [routeOpen, setRouteOpen] = useState(false);
  const [routeForm, setRouteForm] = useState({ route_name: "", street_name: "", city: "Santa Barbara", state: "CA" });
  const [savingRoute, setSavingRoute] = useState(false);

  const [visitOpen, setVisitOpen] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [justSaved, setJustSaved] = useState(false);

  const [visitForm, setVisitForm] = useState({ ...emptyVisitForm });
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [savingVisit, setSavingVisit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkLocating, setBulkLocating] = useState(false);
  const [bulkLocation, setBulkLocation] = useState<{ address: string; lat: number | null; lng: number | null } | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);

  const [researchDraft, setResearchDraft] = useState<Record<string, Partial<Visit>>>({});
  const [savingResearch, setSavingResearch] = useState<string | null>(null);

  const activeRoute = useMemo(() => routes.find((r) => r.id === activeRouteId) || null, [routes, activeRouteId]);

  const BATCH_SIZE = 5;
  const researchBatches = useMemo(() => {
    const ordered = [...visits].sort(orderVisits);

    const out: Visit[][] = [];
    for (let i = 0; i < ordered.length; i += BATCH_SIZE) out.push(ordered.slice(i, i + BATCH_SIZE));
    return out;
  }, [visits]);

  const loadRoutes = useCallback(async (cid: string) => {
    const { data } = await (supabase as any)
      .from("street_sweep_routes")
      .select("*")
      .eq("client_id", cid)
      .order("created_at", { ascending: false });
    const rows = (data || []) as Route[];
    setRoutes(rows);
    setActiveRouteId((prev) => prev || rows[0]?.id || "");
  }, []);

  const loadVisits = useCallback(async (routeId: string) => {
    if (!routeId) { setVisits([]); return; }
    const { data } = await (supabase as any)
      .from("street_sweep_visits")
      .select("*")
      .eq("route_id", routeId)
      .order("created_at", { ascending: false });
    setVisits((data || []) as Visit[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const cid = await resolveEmployeeClientId(user.id);
      setClientId(cid);
      await loadRoutes(cid);
      setLoading(false);
    })();
  }, [loadRoutes]);

  useEffect(() => { loadVisits(activeRouteId); }, [activeRouteId, loadVisits]);

  /* ---------------- routes ---------------- */

  const createRoute = async () => {
    if (!clientId || !userId) return;
    if (!routeForm.route_name.trim() || !routeForm.street_name.trim() || !routeForm.city.trim() || !routeForm.state.trim()) {
      toast({ title: "Missing fields", description: "Route name, street, city and state are required.", variant: "destructive" });
      return;
    }
    setSavingRoute(true);
    const { data, error } = await (supabase as any)
      .from("street_sweep_routes")
      .insert({
        client_id: clientId,
        created_by: userId,
        assigned_to: userId,
        route_name: routeForm.route_name.trim(),
        street_name: routeForm.street_name.trim(),
        city: routeForm.city.trim(),
        state: routeForm.state.trim(),
      })
      .select()
      .single();
    setSavingRoute(false);
    if (error) { toast({ title: "Could not create route", description: error.message, variant: "destructive" }); return; }
    setRoutes((p) => [data as Route, ...p]);
    setActiveRouteId((data as Route).id);
    setRouteOpen(false);
    setRouteForm({ route_name: "", street_name: "", city: "Santa Barbara", state: "CA" });
    toast({ title: "Route created" });
  };

  const completeRoute = async () => {
    if (!activeRoute) return;
    const { error } = await (supabase as any)
      .from("street_sweep_routes").update({ status: "completed" }).eq("id", activeRoute.id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setRoutes((p) => p.map((r) => (r.id === activeRoute.id ? { ...r, status: "completed" } : r)));
    toast({ title: "Route marked complete" });
  };

  /* ---------------- visits ---------------- */

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Location unavailable", description: "Enter the address manually.", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setVisitForm((f) => ({ ...f, lat: latitude, lng: longitude }));
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: "application/json" } },
          );
          const json = await res.json();
          const label = json?.display_name as string | undefined;
          if (label) setVisitForm((f) => ({ ...f, address: label }));
          else toast({ title: "Coordinates captured", description: "Address lookup failed — type it manually." });
        } catch {
          toast({ title: "Coordinates captured", description: "Address lookup failed — type it manually." });
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast({ title: "Location denied", description: "Enter the address manually.", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  /* ---------------- bulk add ---------------- */

  const parseBulkLines = (raw: string) =>
    raw
      .split(/\r?\n/)
      .map((line) => {
        const idx = line.indexOf(",");
        const business_name = (idx === -1 ? line : line.slice(0, idx)).trim();
        const address = idx === -1 ? "" : line.slice(idx + 1).trim();
        return { business_name, address };
      })
      .filter((r) => r.business_name.length > 0);

  const parsedBulk = useMemo(() => parseBulkLines(bulkText), [bulkText]);

  const captureBulkLocation = () => {
    if (bulkLocation) { setBulkLocation(null); return; }
    if (!navigator.geolocation) {
      toast({ title: "Location unavailable", description: "Add addresses inline instead.", variant: "destructive" });
      return;
    }
    setBulkLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let label = "";
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: "application/json" } },
          );
          const json = await res.json();
          label = (json?.display_name as string) || "";
        } catch { /* fall through to coords-only */ }
        setBulkLocation({ address: label, lat: latitude, lng: longitude });
        setBulkLocating(false);
        toast({
          title: label ? "Location applied to all" : "Coordinates captured",
          description: label || "Address lookup failed — add addresses inline.",
        });
      },
      () => {
        setBulkLocating(false);
        toast({ title: "Location denied", description: "Add addresses inline instead.", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const saveBulk = async () => {
    if (!clientId || !userId || !activeRouteId) return;
    const rows = parsedBulk;
    if (!rows.length) {
      toast({ title: "Nothing to add", description: "Enter at least one business name.", variant: "destructive" });
      return;
    }
    setBulkSaving(true);
    const payload = rows.map((r) => ({
      route_id: activeRouteId,
      client_id: clientId,
      visited_by: userId,
      business_name: r.business_name,
      address: r.address || bulkLocation?.address || "",
      unit_suite: null,
      lat: r.address ? null : bulkLocation?.lat ?? null,
      lng: r.address ? null : bulkLocation?.lng ?? null,
      storefront_status: "open",
      has_signage: true,
      has_booking_qr: false,
      niche_guess: null,
      notes: null,
      photo_url: null,
    }));
    const { data, error } = await (supabase as any)
      .from("street_sweep_visits").insert(payload).select();
    setBulkSaving(false);
    if (error) { toast({ title: "Bulk add failed", description: error.message, variant: "destructive" }); return; }
    const added = (data || []) as Visit[];
    setVisits((p) => [...added].reverse().concat(p));
    setSessionCount((c) => c + added.length);
    setBulkText("");
    setBulkLocation(null);
    setBulkOpen(false);
    toast({ title: `${added.length} ${added.length === 1 ? "business" : "businesses"} logged` });
  };


  const onPhoto = async (file: File) => {
    if (!clientId) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${clientId}/${activeRouteId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("street-sweep-photos").upload(path, file, { upsert: false });
    setUploading(false);
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return; }
    setVisitForm((f) => ({ ...f, photo_url: path }));
    toast({ title: "Photo attached" });
  };

  const openNewVisit = () => {
    setEditingVisitId(null);
    setVisitForm({ ...emptyVisitForm });
    setSessionCount(0);
    setJustSaved(false);
    setVisitOpen(true);
  };


  const openEditVisit = (v: Visit) => {
    setEditingVisitId(v.id);
    setVisitForm({
      business_name: v.business_name,
      address: v.address,
      unit_suite: v.unit_suite || "",
      storefront_status: v.storefront_status,
      has_signage: v.has_signage ?? true,
      has_booking_qr: v.has_booking_qr ?? false,
      niche_guess: v.niche_guess || "",
      notes: v.notes || "",
      lat: v.lat,
      lng: v.lng,
      photo_url: v.photo_url,
    });
    setVisitOpen(true);
  };

  const saveVisit = async () => {
    if (!clientId || !userId || !activeRouteId) return;
    if (!visitForm.business_name.trim() || !visitForm.address.trim()) {
      toast({ title: "Missing fields", description: "Business name and address are required.", variant: "destructive" });
      return;
    }
    setSavingVisit(true);
    const payload = {
      route_id: activeRouteId,
      client_id: clientId,
      visited_by: userId,
      business_name: visitForm.business_name.trim(),
      address: visitForm.address.trim(),
      unit_suite: visitForm.unit_suite.trim() || null,
      lat: visitForm.lat,
      lng: visitForm.lng,
      storefront_status: visitForm.storefront_status,
      has_signage: visitForm.has_signage,
      has_booking_qr: visitForm.has_booking_qr,
      niche_guess: visitForm.niche_guess.trim() || null,
      notes: visitForm.notes.trim() || null,
      photo_url: visitForm.photo_url,
    };
    if (editingVisitId) {
      const { data, error } = await (supabase as any)
        .from("street_sweep_visits").update(payload).eq("id", editingVisitId).select().single();
      setSavingVisit(false);
      if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
      setVisits((p) => p.map((v) => (v.id === editingVisitId ? (data as Visit) : v)));
      setVisitOpen(false);
      setEditingVisitId(null);
      setVisitForm({ ...emptyVisitForm });
      toast({ title: "Visit updated" });
      return;
    }

    const { data, error } = await (supabase as any)
      .from("street_sweep_visits").insert(payload).select().single();
    setSavingVisit(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    setVisits((p) => [data as Visit, ...p]);
    // rapid-entry: keep the dialog open, reset for the next storefront
    setVisitForm({ ...emptyVisitForm, has_signage: visitForm.has_signage });
    setSessionCount((c) => c + 1);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1600);
    toast({ title: "Saved — next business" });
  };



  const deleteVisit = async (id: string) => {
    const { error } = await (supabase as any).from("street_sweep_visits").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    setVisits((p) => p.filter((v) => v.id !== id));
  };

  /* ---------------- export + research ---------------- */

  const visitLine = (v: Visit) =>
    `${v.business_name} | ${v.address}${v.unit_suite ? ` ${v.unit_suite}` : ""} | ${v.niche_guess || "Unknown"}`;

  const copyVisits = async (rows: Visit[], label: string) => {
    if (!rows.length) return;
    try {
      await navigator.clipboard.writeText(rows.map(visitLine).join("\n"));
      toast({ title: "Copied", description: `${label}: ${rows.length} businesses copied to clipboard.` });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard unavailable in this browser.", variant: "destructive" });
    }
  };

  const exportForResearch = async () => {
    const ordered = [...visits].sort((a, b) => a.created_at.localeCompare(b.created_at));
    await copyVisits(ordered, "All visits");
  };

  const copyResearchPrompt = async () => {
    try {
      await navigator.clipboard.writeText(STREET_SWEEP_RESEARCH_PROMPT);
      toast({ title: "Research prompt copied", description: "Paste it into a fresh Claude chat with web search ON." });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard unavailable in this browser.", variant: "destructive" });
    }
  };

  const copyDiscoveryPrompt = async () => {
    try {
      await navigator.clipboard.writeText(STREET_DISCOVERY_PROMPT);
      toast({ title: "Discovery prompt copied", description: "Paste it into a chat with Google Maps/Places search tools." });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard unavailable in this browser.", variant: "destructive" });
    }
  };

  const saveResearch = async (v: Visit) => {
    if (!clientId) return;
    const draft = researchDraft[v.id] || {};
    const owner_name = (draft.owner_name ?? v.owner_name) || null;
    const owner_phone = (draft.owner_phone ?? v.owner_phone) || null;
    const website = (draft.website ?? v.website) || null;
    const booking_link_type = (draft.booking_link_type ?? v.booking_link_type) || null;

    setSavingResearch(v.id);
    let leadId = v.lead_id;
    if (owner_name && !leadId) {
      const { data: lead, error: leadErr } = await (supabase as any)
        .from("nl_bdr_leads")
        .insert({
          client_id: clientId,
          user_id: v.visited_by,
          business_name: v.business_name,
          owner_name,
          phone: owner_phone,
          website,
          niche: v.niche_guess,
          lead_source: "bdr_field",
        })
        .select("id")
        .single();
      if (leadErr) {
        setSavingResearch(null);
        toast({ title: "Lead creation failed", description: leadErr.message, variant: "destructive" });
        return;
      }
      leadId = lead.id as string;
    }

    const { data, error } = await (supabase as any)
      .from("street_sweep_visits")
      .update({
        owner_name, owner_phone, website, booking_link_type,
        lead_id: leadId,
        research_status: owner_name ? "researched" : v.research_status,
      })
      .eq("id", v.id).select().single();
    setSavingResearch(null);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    setVisits((p) => p.map((x) => (x.id === v.id ? (data as Visit) : x)));
    setResearchDraft((p) => { const n = { ...p }; delete n[v.id]; return n; });
    toast({ title: owner_name ? "Saved — lead created" : "Saved" });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const isComplete = activeRoute?.status === "completed";

  return (
    <div className="space-y-6">
      <PageHeader title="In-Person" description="Discover businesses by street, log them, then research owner info — all in batches of 5.">
        <Button onClick={() => setRouteOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Route
        </Button>
      </PageHeader>

      {/* How It Works guide */}
      <Collapsible open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CollapsibleTrigger asChild>
            <CardContent className="p-4 cursor-pointer flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">How This Works</p>
                  <p className="text-xs text-muted-foreground">7-step workflow: discover → bulk add → research → log results</p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${howItWorksOpen ? "rotate-180" : ""}`} />
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 pt-0">
              <ol className="space-y-4 text-sm text-muted-foreground">
                {[
                  <>Tap <Badge variant="outline" className="mx-0.5 font-normal">Copy Discovery Prompt</Badge> below. Paste it into a fresh Claude chat, then tell it the street, city, and state.</>,
                  <>Claude finds every real business it can on the street in one pass. Copy that whole list and paste it directly into <Badge variant="outline" className="mx-0.5 font-normal">Bulk Add</Badge> here — all at once, not 5 at a time.</>,
                  <>If Claude says it only covered part of a long street, ask it to continue with the next section, then paste that in too.</>,
                  <>Back here, batches of 5 form automatically in <Badge variant="outline" className="mx-0.5 font-normal">Research Batches</Badge> as you log businesses — no need to finish the whole street first.</>,
                  <>On a Ready batch, tap <Badge variant="outline" className="mx-0.5 font-normal">Copy Research Prompt</Badge> and paste it into a <strong className="text-foreground">NEW, separate</strong> Claude chat (not the discovery one), then tap <Badge variant="outline" className="mx-0.5 font-normal">Export Batch</Badge> and paste those 5 businesses right after the prompt.</>,
                  <>Claude returns owner name, phone, and booking link for all 5 — and keeps working through additional batches automatically if you paste more than one batch's worth.</>,
                  <>Type the results into <Badge variant="outline" className="mx-0.5 font-normal">Log Research Results</Badge> on each business here. Saving an owner name auto-creates the lead in My Leads.</>,
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </CollapsibleContent>

        </Card>
      </Collapsible>

      {/* Route selector */}
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <Label className="text-xs text-muted-foreground">Active route</Label>
            <Select value={activeRouteId} onValueChange={setActiveRouteId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder={routes.length ? "Select a route" : "No routes yet"} />
              </SelectTrigger>
              <SelectContent>
                {routes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.route_name} — {r.street_name}, {r.city} {r.status === "completed" ? "(complete)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {activeRoute && (
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="gap-1"><MapPin className="h-3 w-3" />{visits.length} logged</Badge>
              {isComplete
                ? <Badge className="bg-[hsl(142,72%,42%)]/15 text-[hsl(142,72%,42%)] border-0">Completed</Badge>
                : <Button variant="outline" size="sm" onClick={completeRoute} className="gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Mark Route Complete
                  </Button>}
            </div>
          )}
        </CardContent>
      </Card>

      {activeRoute && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Discover &amp; Log</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={copyDiscoveryPrompt} className="gap-2">
                  <ClipboardList className="h-4 w-4" /> Copy Discovery Prompt
                </Button>
                <Button onClick={openNewVisit} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Business
                </Button>
                <Button variant="outline" onClick={() => setBulkOpen(true)} className="gap-2">
                  <ClipboardList className="h-4 w-4" /> Bulk Add
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Research</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={copyResearchPrompt} className="gap-2">
                  <ClipboardList className="h-4 w-4" /> Copy Research Prompt
                </Button>
                <Button variant="outline" onClick={exportForResearch} className="gap-2" disabled={visits.length === 0}>
                  <Copy className="h-4 w-4" /> Export All
                </Button>
              </div>
            </div>
          </div>


          {researchBatches.length > 0 && (
            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardContent className="p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Research Batches</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {researchBatches.map((batch, i) => {
                    const full = batch.length === BATCH_SIZE;
                    const remaining = BATCH_SIZE - batch.length;
                    return (
                      <div key={i} className="rounded-lg border border-border/60 bg-background/40 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            Batch {i + 1} — {full ? `${batch.length} businesses` : `${batch.length} of ${BATCH_SIZE} logged`}
                          </span>
                          {full && <Badge className="bg-[hsl(142,72%,42%)]/15 text-[hsl(142,72%,42%)] border-0">Ready</Badge>}
                        </div>
                        <div className="flex gap-1">
                          {Array.from({ length: BATCH_SIZE }).map((_, s) => (
                            <div
                              key={s}
                              className={`h-1.5 flex-1 rounded-full ${
                                s < batch.length
                                  ? full ? "bg-[hsl(142,72%,42%)]" : "bg-primary"
                                  : "bg-border/60"
                              }`}
                            />
                          ))}
                        </div>
                        {!full && (
                          <p className="text-xs text-muted-foreground">
                            {remaining} more to complete this batch.
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          <Button size="sm" variant="outline" onClick={copyResearchPrompt} className="gap-1.5">
                            <ClipboardList className="h-3.5 w-3.5" /> Copy Research Prompt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!full}
                            onClick={() => copyVisits(batch, `Batch ${i + 1}`)}
                            className="gap-1.5"
                          >
                            <Copy className="h-3.5 w-3.5" /> Export Batch
                          </Button>
                          {!full && (
                            <button
                              type="button"
                              onClick={() => copyVisits(batch, `Batch ${i + 1} (partial)`)}
                              className="text-xs underline text-muted-foreground hover:text-foreground"
                            >
                              Export Partial Batch Anyway
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}



          <div className="space-y-3">
            {visits.length === 0 && (
              <Card className="border-dashed border-border/60 bg-card/40">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No businesses logged on this route yet.
                </CardContent>
              </Card>
            )}
            {visits.map((v) => {
              const draft = researchDraft[v.id] || {};
              return (
                <Card key={v.id} className="border-border/60 bg-card/60 backdrop-blur">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      {v.photo_url ? <PhotoThumb path={v.photo_url} /> : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-foreground break-words">{v.business_name}</span>
                          <Badge className={`border-0 text-[10px] uppercase ${statusTone(v.storefront_status)}`}>{v.storefront_status}</Badge>
                          {v.niche_guess && <Badge variant="secondary" className="text-[10px]">{v.niche_guess}</Badge>}
                          {v.has_booking_qr && <Badge variant="outline" className="text-[10px]">Booking QR</Badge>}
                          {v.research_status === "researched" && (
                            <Badge className="border-0 text-[10px] bg-primary/15 text-primary">Researched</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 break-words">
                          {v.address}{v.unit_suite ? ` · ${v.unit_suite}` : ""}
                        </p>
                        {v.notes && <p className="text-xs text-muted-foreground/80 mt-1 break-words">{v.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => openEditVisit(v)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteVisit(v.id)} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {isComplete && (
                      <div className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Log Research Results</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input placeholder="Owner name" value={draft.owner_name ?? v.owner_name ?? ""}
                            onChange={(e) => setResearchDraft((p) => ({ ...p, [v.id]: { ...draft, owner_name: e.target.value } }))} />
                          <Input placeholder="Owner phone" value={draft.owner_phone ?? v.owner_phone ?? ""}
                            onChange={(e) => setResearchDraft((p) => ({ ...p, [v.id]: { ...draft, owner_phone: e.target.value } }))} />
                          <Input placeholder="Website" value={draft.website ?? v.website ?? ""}
                            onChange={(e) => setResearchDraft((p) => ({ ...p, [v.id]: { ...draft, website: e.target.value } }))} />
                          <Input placeholder="Booking link type" value={draft.booking_link_type ?? v.booking_link_type ?? ""}
                            onChange={(e) => setResearchDraft((p) => ({ ...p, [v.id]: { ...draft, booking_link_type: e.target.value } }))} />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => saveResearch(v)} disabled={savingResearch === v.id}>
                            {savingResearch === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Research"}
                          </Button>
                          {v.lead_id && <span className="text-[11px] text-muted-foreground">Lead created</span>}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* New route modal */}
      <Dialog open={routeOpen} onOpenChange={setRouteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Route</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Route name *</Label><Input value={routeForm.route_name} onChange={(e) => setRouteForm({ ...routeForm, route_name: e.target.value })} placeholder="State St — 1200 block" /></div>
            <div><Label>Street name *</Label><Input value={routeForm.street_name} onChange={(e) => setRouteForm({ ...routeForm, street_name: e.target.value })} placeholder="State St" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>City *</Label><Input value={routeForm.city} onChange={(e) => setRouteForm({ ...routeForm, city: e.target.value })} /></div>
              <div><Label>State *</Label><Input value={routeForm.state} onChange={(e) => setRouteForm({ ...routeForm, state: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRouteOpen(false)}>Cancel</Button>
            <Button onClick={createRoute} disabled={savingRoute}>
              {savingRoute ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Route"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / edit business modal */}
      <Dialog open={visitOpen} onOpenChange={setVisitOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingVisitId ? "Edit Business" : "Add Business"}</DialogTitle></DialogHeader>
          {!editingVisitId && (
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-3 py-2">
              <span className="text-xs text-muted-foreground">{sessionCount} logged this session</span>
              {justSaved && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-[hsl(142,72%,42%)]">
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </span>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div><Label>Business name *</Label><Input value={visitForm.business_name} onChange={(e) => setVisitForm({ ...visitForm, business_name: e.target.value })} /></div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Address *</Label>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={useMyLocation} disabled={locating}>
                  {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />} Use My Location
                </Button>
              </div>
              <Input value={visitForm.address} onChange={(e) => setVisitForm({ ...visitForm, address: e.target.value })} />
            </div>
            <div><Label>Unit / Suite</Label><Input value={visitForm.unit_suite} onChange={(e) => setVisitForm({ ...visitForm, unit_suite: e.target.value })} /></div>

            <div>
              <Label>Storefront status</Label>
              <div className="grid grid-cols-4 gap-2 mt-1.5">
                {STOREFRONT.map((s) => (
                  <Button key={s} type="button" size="sm"
                    variant={visitForm.storefront_status === s ? "default" : "outline"}
                    onClick={() => setVisitForm({ ...visitForm, storefront_status: s })}
                    className="capitalize text-xs">{s}</Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
              <Label className="text-sm">Has signage</Label>
              <Switch checked={visitForm.has_signage} onCheckedChange={(c) => setVisitForm({ ...visitForm, has_signage: c })} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
              <Label className="text-sm">Booking QR visible</Label>
              <Switch checked={visitForm.has_booking_qr} onCheckedChange={(c) => setVisitForm({ ...visitForm, has_booking_qr: c })} />
            </div>

            <div><Label>Niche guess</Label><Input value={visitForm.niche_guess} onChange={(e) => setVisitForm({ ...visitForm, niche_guess: e.target.value })} placeholder="Salon, barber, med spa…" /></div>
            <div><Label>Notes</Label><Textarea rows={3} value={visitForm.notes} onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })} /></div>

            <div>
              <Label>Storefront photo</Label>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.currentTarget.value = ""; }} />
              <div className="flex items-center gap-2 mt-1.5">
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Capture Photo
                </Button>
                {visitForm.photo_url && (
                  <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-xs"
                    onClick={() => setVisitForm({ ...visitForm, photo_url: null })}>
                    <X className="h-3.5 w-3.5" /> Remove
                  </Button>
                )}
              </div>
              {visitForm.photo_url && <div className="mt-2"><PhotoThumb path={visitForm.photo_url} /></div>}
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={() => { setVisitOpen(false); setEditingVisitId(null); }}>
              {editingVisitId ? "Cancel" : "Done for Now"}
            </Button>
            <Button onClick={saveVisit} disabled={savingVisit} className="gap-2">
              {savingVisit ? <Loader2 className="h-4 w-4 animate-spin" /> : editingVisitId ? "Save Changes" : "Save & Next"}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      {/* Bulk add modal */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Bulk Add Businesses</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
              <div>
                <Label className="text-sm">Use My Location for All</Label>
                <p className="text-xs text-muted-foreground">
                  {bulkLocation
                    ? bulkLocation.address || "Coordinates captured"
                    : "Applies to lines without their own address"}
                </p>
              </div>
              <Button variant={bulkLocation ? "default" : "outline"} size="sm" className="gap-1.5"
                onClick={captureBulkLocation} disabled={bulkLocating}>
                {bulkLocating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                {bulkLocation ? "Clear" : "Capture"}
              </Button>
            </div>

            <Textarea
              rows={10}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"One business per line. Optionally add an address after a comma:\nJoe's Coffee\nSunset Nails, 1215 State St\nAnother Shop"}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {parsedBulk.length} valid {parsedBulk.length === 1 ? "line" : "lines"} detected
            </p>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={saveBulk} disabled={bulkSaving || !parsedBulk.length} className="gap-2">
              {bulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Add ${parsedBulk.length || ""}`.trim()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
