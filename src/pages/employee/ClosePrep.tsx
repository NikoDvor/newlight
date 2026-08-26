import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Check, Calendar as CalIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ensureBdrCalendar } from "@/lib/bdrCalendar";
import { computeAvailableSlots, weeklyMapToRows } from "@/lib/availabilitySlots";

interface Lead {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  user_id: string;
  crm_deal_id: string | null;
}

export default function ClosePrep() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [availability, setAvailability] = useState<any>(null);
  const [calTimezone, setCalTimezone] = useState<string>("America/Los_Angeles");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [initialFee, setInitialFee] = useState("");
  const [recurringFee, setRecurringFee] = useState("");
  const [kpiTarget, setKpiTarget] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  useEffect(() => {
    (async () => {
      if (!leadId) return;
      const { data: userResp } = await supabase.auth.getUser();
      const uid = userResp.user?.id;
      if (!uid) { setLoading(false); return; }

      const { data: ld } = await (supabase as any)
        .from("nl_bdr_leads")
        .select("id, business_name, owner_name, phone, email, website, city, user_id, crm_deal_id")
        .eq("id", leadId)
        .maybeSingle();
      setLead(ld || null);

      const cal = await ensureBdrCalendar();
      setAvailability(cal?.availability || null);
      setCalTimezone(cal?.timezone || "America/Los_Angeles");
      setLoading(false);
    })();
  }, [leadId]);

  const slots = useMemo(() => {
    if (!availability) return [];
    return computeAvailableSlots(weeklyMapToRows(availability), {
      durationMinutes: 45,
      slotIntervalMinutes: 30,
      minNoticeMinutes: 0,
      daysAhead: 14,
      timeZone: calTimezone,
    }).map((d) => ({
      date: d,
      label: d.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    }));
  }, [availability, calTimezone]);

  const canSubmit =
    !!lead && !!selectedSlot && !!initialFee.trim() && !!recurringFee.trim();

  const submit = async () => {
    if (!lead || !canSubmit) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("close-prep-submit", {
      body: {
        lead_id: lead.id,
        initial_fee: Number(initialFee),
        recurring_fee: Number(recurringFee),
        retainer_kpi: kpiTarget || null,
        closing_notes: notes || null,
        meeting_starts_at: selectedSlot,
        duration_minutes: 45,
      },
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Couldn't complete close prep", description: (error as any).message || "Try again.", variant: "destructive" });
      return;
    }
    if ((data as any)?.error) {
      toast({ title: "Couldn't complete close prep", description: (data as any).error, variant: "destructive" });
      return;
    }
    setDone(true);
    toast({ title: "Close prep complete", description: "Closing meeting scheduled and notifications sent." });
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-white/40" />
    </div>
  );
  if (!lead) return (
    <div className="max-w-xl mx-auto p-8 text-center space-y-3">
      <h1 className="text-lg font-bold text-white">Lead not found</h1>
      <p className="text-sm text-white/60">You may not have access to this lead.</p>
      <Button variant="outline" onClick={() => navigate("/employee/leads")}>Back to My Leads</Button>
    </div>
  );
  if (done) return (
    <div className="max-w-xl mx-auto p-8">
      <div className="text-center space-y-3 p-8 rounded-xl border border-white/10 bg-white/[0.03]">
        <div className="mx-auto h-12 w-12 rounded-full bg-[hsl(142,72%,42%)]/20 flex items-center justify-center">
          <Check className="h-6 w-6 text-[hsl(142,72%,42%)]" />
        </div>
        <h1 className="text-xl font-bold text-white">Close prep complete</h1>
        <p className="text-sm text-white/60">
          Closing meeting scheduled with {lead.business_name}. Check your email — we sent you the deal terms and contact info to bring to the meeting.
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <Button variant="outline" onClick={() => navigate("/employee/leads")}>Back to My Leads</Button>
          <Button onClick={() => navigate("/employee/calendar")}>View Calendar</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto py-6 px-4 space-y-5">
      <div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/45 mb-1">
          <CalIcon className="h-3.5 w-3.5" /> Form 2 · Close Prep
        </div>
        <h1 className="text-2xl font-bold text-white">{lead.business_name}</h1>
        <div className="text-sm text-white/60 mt-1 space-x-3">
          {lead.owner_name && <span>{lead.owner_name}</span>}
          {lead.phone && <span>·  {lead.phone}</span>}
          {lead.email && <span>·  {lead.email}</span>}
          {lead.city && <span>·  {lead.city}</span>}
        </div>
      </div>

      <section className="space-y-3 p-4 rounded-xl border border-white/10 bg-white/[0.03]">
        <h2 className="text-sm font-semibold text-white">Deal Terms</h2>

        <div>
          <Label className="text-xs text-white/60">Initial Fee (USD) <span className="text-red-500">*</span></Label>
          <Input
            type="number" min="0" step="0.01"
            value={initialFee}
            onChange={e => setInitialFee(e.target.value)}
            placeholder="e.g. 2500"
            className="bg-white/5 border-white/10 text-white mt-1"
          />
        </div>

        <div>
          <Label className="text-xs text-white/60">Recurring Fee (USD / month) <span className="text-red-500">*</span></Label>
          <Input
            type="number" min="0" step="0.01"
            value={recurringFee}
            onChange={e => setRecurringFee(e.target.value)}
            placeholder="e.g. 1500"
            className="bg-white/5 border-white/10 text-white mt-1"
          />
        </div>

        <div>
          <Label className="text-xs text-white/60">KPI Target</Label>
          <Textarea
            value={kpiTarget}
            onChange={e => setKpiTarget(e.target.value)}
            rows={2}
            placeholder="e.g. Generate $10,000/mo in attributable pipeline value"
            className="bg-white/5 border-white/10 text-white mt-1"
          />
          <p className="text-[11px] text-white/45 mt-1">
            Optional but recommended — the performance target this retainer is evaluated against.
          </p>
        </div>

        <div>
          <Label className="text-xs text-white/60">Internal Closing Notes</Label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="What did they care about? Objections? Anything to bring to the closing meeting."
            className="bg-white/5 border-white/10 text-white mt-1"
          />
        </div>
      </section>

      <section className="space-y-3 p-4 rounded-xl border border-white/10 bg-white/[0.03]">
        <div>
          <h2 className="text-sm font-semibold text-white">Schedule Closing Meeting</h2>
          <p className="text-xs text-white/50 mt-0.5">On your own calendar. 45-minute block.</p>
        </div>
        {slots.length === 0 ? (
          <div className="text-sm text-white/60 p-3 rounded-md bg-white/5 border border-white/10">
            No availability configured on your calendar yet. Set your availability first, then come back.
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={() => navigate("/employee/calendar")}>Open Calendar</Button>
            </div>
          </div>
        ) : (
          <select
            value={selectedSlot}
            onChange={e => setSelectedSlot(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
          >
            <option value="" className="bg-[hsl(215,35%,12%)]">— Select a time —</option>
            {slots.map(s => (
              <option key={s.date.toISOString()} value={s.date.toISOString()} className="bg-[hsl(215,35%,12%)]">
                {s.label}
              </option>
            ))}
          </select>
        )}
      </section>

      <Button
        onClick={submit}
        disabled={submitting || !canSubmit}
        className="w-full bg-[hsl(211,96%,56%)] hover:bg-[hsl(211,96%,48%)]"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete Close Prep"}
      </Button>
      {!canSubmit && (
        <p className="text-xs text-red-400 text-center">
          Fill in all required fields and pick a closing meeting time.
        </p>
      )}
    </div>
  );
}
