import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, MapPin, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface Street {
  id: string;
  street_name: string;
  city: string;
  state: string;
  status: string;
  current_position: number;
  total_count: number;
}

interface Lead {
  id: string;
  walk_sequence: number;
  business_name: string;
  owner_name: string | null;
  website: string | null;
  has_booking_page: boolean | null;
  sells_online: boolean | null;
  niche: string | null;
  address: string | null;
  status: string;
  outcome: string | null;
  notes: string | null;
}

const OUTCOMES: { label: string; tone: string; status: string }[] = [
  { label: "Spoke to Owner", tone: "hsl(142,72%,42%)", status: "contacted" },
  { label: "Come Back", tone: "hsl(38,92%,55%)", status: "follow_up" },
  { label: "Reach Out", tone: "hsl(211,96%,60%)", status: "follow_up" },
  { label: "Not Interested", tone: "hsl(15,80%,55%)", status: "closed" },
  { label: "Closed/Gone", tone: "hsl(215,15%,45%)", status: "closed" },
];

const cardStyle = {
  background: "hsla(215,35%,10%,.7)",
  border: "1px solid hsla(211,96%,60%,.16)",
};

export default function InPersonStreetWalk() {
  const { streetId } = useParams<{ streetId: string }>();
  const navigate = useNavigate();
  const { user } = useWorkspace();

  const [street, setStreet] = useState<Street | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [booking, setBooking] = useState(false);
  const [online, setOnline] = useState(false);
  const [notes, setNotes] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ business_name: "", niche: "Service", address: "", notes: "" });

  const load = useCallback(async () => {
    if (!streetId) return;
    setLoading(true);
    const { data: s, error } = await (supabase as any)
      .from("nl_inperson_streets")
      .select("id, street_name, city, state, status, current_position, total_count")
      .eq("id", streetId)
      .maybeSingle();
    if (error || !s) {
      toast({ title: "Street not found", description: error?.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setStreet(s as Street);

    const { data: rows } = await (supabase as any)
      .from("nl_inperson_leads")
      .select("id, walk_sequence, business_name, owner_name, website, has_booking_page, sells_online, niche, address, status, outcome, notes")
      .eq("street_id", streetId)
      .gt("walk_sequence", (s as Street).current_position)
      .order("walk_sequence", { ascending: true })
      .limit(1);

    const next = (rows?.[0] as Lead | undefined) || null;
    setLead(next);
    setBooking(Boolean(next?.has_booking_page));
    setOnline(Boolean(next?.sells_online));
    setNotes(next?.notes || "");
    setLoading(false);
  }, [streetId]);

  useEffect(() => { load(); }, [load]);

  const logOutcome = async (outcome: { label: string; status: string }) => {
    if (!lead || !street || !user?.id || saving) return;
    setSaving(true);
    try {
      const { error: oErr } = await (supabase as any).from("nl_inperson_outcomes").insert({
        lead_id: lead.id,
        rep_user_id: user.id,
        outcome: outcome.label,
        notes: notes.trim() || null,
      });
      if (oErr) throw oErr;

      const { error: lErr } = await (supabase as any).from("nl_inperson_leads").update({
        status: outcome.status,
        outcome: outcome.label,
        notes: notes.trim() || null,
        has_booking_page: booking,
        sells_online: online,
        updated_at: new Date().toISOString(),
      }).eq("id", lead.id);
      if (lErr) throw lErr;

      const nextPos = Math.min(street.current_position + 1, street.total_count);
      const done = nextPos >= street.total_count;
      const { error: sErr } = await (supabase as any).from("nl_inperson_streets").update({
        current_position: nextPos,
        status: done ? "complete" : "in_progress",
        updated_at: new Date().toISOString(),
      }).eq("id", street.id);
      if (sErr) throw sErr;

      await load();
    } catch (e: any) {
      toast({ title: "Couldn't log outcome", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addBusiness = async () => {
    if (!street || !addForm.business_name.trim()) return;
    setSaving(true);
    try {
      const insertAt = street.current_position + 1;
      // Make room: shift everything at/after insertAt down by one (highest first).
      const { data: shiftRows } = await (supabase as any)
        .from("nl_inperson_leads")
        .select("id, walk_sequence")
        .eq("street_id", street.id)
        .gte("walk_sequence", insertAt)
        .order("walk_sequence", { ascending: false });
      for (const r of (shiftRows || []) as { id: string; walk_sequence: number }[]) {
        await (supabase as any).from("nl_inperson_leads")
          .update({ walk_sequence: r.walk_sequence + 1 }).eq("id", r.id);
      }

      const { error } = await (supabase as any).from("nl_inperson_leads").insert({
        street_id: street.id,
        walk_sequence: insertAt,
        business_name: addForm.business_name.trim(),
        niche: addForm.niche || null,
        address: addForm.address.trim() || null,
        notes: addForm.notes.trim() || null,
        status: "pending",
        added_mid_walk: true,
      });
      if (error) throw error;

      const { error: sErr } = await (supabase as any).from("nl_inperson_streets").update({
        total_count: street.total_count + 1,
        status: "in_progress",
        updated_at: new Date().toISOString(),
      }).eq("id", street.id);
      if (sErr) throw sErr;

      setAddOpen(false);
      setAddForm({ business_name: "", niche: "Service", address: "", notes: "" });
      toast({ title: "Business added" });
      await load();
    } catch (e: any) {
      toast({ title: "Couldn't add business", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/50 text-sm py-10">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading walk…
      </div>
    );
  }

  if (!street) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/employee/in-person")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="text-sm text-white/50">This street is no longer available.</div>
      </div>
    );
  }

  const pct = street.total_count ? Math.round((street.current_position / street.total_count) * 100) : 0;
  const complete = !lead || street.current_position >= street.total_count;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[hsl(211,96%,68%)]" /> {street.street_name}
          </h1>
          <p className="text-xs text-white/50 mt-1">{street.city}, {street.state}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigate("/employee/in-person")} aria-label="Exit walk">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-white/60">
          <span>{street.current_position} of {street.total_count}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsla(215,35%,18%,.9)" }}>
          <div className="h-full transition-all" style={{ width: `${pct}%`, background: "hsl(211,96%,60%)" }} />
        </div>
      </div>

      {complete ? (
        <div className="rounded-xl p-8 text-center space-y-3" style={cardStyle}>
          <CheckCircle2 className="h-10 w-10 mx-auto text-[hsl(142,72%,45%)]" />
          <div className="text-lg font-semibold text-white">
            Street complete — {street.current_position} of {street.total_count}
          </div>
          <Button onClick={() => navigate("/employee/in-person")}>Back to In-Person</Button>
        </div>
      ) : (
        <>
          <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-base font-semibold text-white break-words">{lead!.business_name}</div>
                {lead!.address && <div className="text-xs text-white/55 break-words">{lead!.address}</div>}
                {lead!.owner_name && <div className="text-xs text-white/70 mt-1">Owner: {lead!.owner_name}</div>}
              </div>
              {lead!.niche && <Badge variant="secondary" className="text-[10px] shrink-0">{lead!.niche}</Badge>}
            </div>

            {lead!.website && (
              <a
                href={lead!.website.startsWith("http") ? lead!.website : `https://${lead!.website}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[hsl(211,96%,70%)] hover:underline break-all"
              >
                <ExternalLink className="h-3 w-3 shrink-0" /> {lead!.website}
              </a>
            )}

            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs text-white/75">
                <Checkbox checked={booking} onCheckedChange={(v) => setBooking(Boolean(v))} />
                Has booking page
              </label>
              <label className="flex items-center gap-2 text-xs text-white/75">
                <Checkbox checked={online} onCheckedChange={(v) => setOnline(Boolean(v))} />
                Sells online
              </label>
            </div>

            <div>
              <Label className="text-[11px] uppercase tracking-wider text-white/50">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 text-sm" placeholder="What happened…" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o.label}
                disabled={saving}
                onClick={() => logOutcome(o)}
                className="rounded-xl px-3 py-3 text-sm font-medium text-white text-left transition-all disabled:opacity-50"
                style={{ background: `${o.tone.replace("hsl", "hsla").replace(")", ",.14)")}`, border: `1px solid ${o.tone.replace("hsl", "hsla").replace(")", ",.45)")}` }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}

      <Button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-6 right-6 rounded-full h-12 w-12 p-0 shadow-lg z-40"
        aria-label="Add business"
      >
        <Plus className="h-5 w-5" />
      </Button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Business</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Business Name *</Label>
              <Input value={addForm.business_name} onChange={(e) => setAddForm({ ...addForm, business_name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Niche</Label>
              <select
                value={addForm.niche}
                onChange={(e) => setAddForm({ ...addForm, niche: e.target.value })}
                className="w-full mt-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[hsl(211,96%,56%)]"
              >
                <option value="Service" className="bg-[hsl(220,35%,12%)]">Service</option>
                <option value="Product" className="bg-[hsl(220,35%,12%)]">Product</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Input value={addForm.address} onChange={(e) => setAddForm({ ...addForm, address: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addBusiness} disabled={saving || !addForm.business_name.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
