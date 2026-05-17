import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Calendar, Clock, Mail, Phone, Building2, User, CheckCircle2, XCircle, RotateCcw, Loader2, Plus } from "lucide-react";

type Attendance = "pending" | "attended" | "no_show" | "rescheduled";

interface LeadLite {
  id: string;
  user_id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  email?: string | null;
  notes?: string | null;
  customer_notes?: string | null;
  pipeline_stage?: string | null;
  status?: string | null;
}

interface EventRow {
  id: string;
  calendar_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  attendance: Attendance;
  outcome: string | null;
  notes: string | null;
  source: string;
}

const STAGES = [
  { key: "cold", label: "Cold", color: "hsl(200, 70%, 60%)" },
  { key: "warm", label: "Warm", color: "hsl(38, 90%, 60%)" },
  { key: "hot", label: "Hot", color: "hsl(12, 85%, 60%)" },
  { key: "won", label: "Won", color: "hsl(140, 70%, 55%)" },
];

const ATTENDANCE_OPTIONS: { key: Attendance; label: string; tone: string }[] = [
  { key: "attended", label: "Attended", tone: "hsl(140,70%,55%)" },
  { key: "no_show", label: "No-Show", tone: "hsl(0,75%,60%)" },
  { key: "rescheduled", label: "Rescheduled", tone: "hsl(38,90%,60%)" },
];

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function useCountdown(target: Date | null) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!target) return;
    const i = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(i);
  }, [target]);
  if (!target) return null;
  void tick;
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return "Now";
  const mins = Math.floor(diff / 60_000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${m}m`;
  return `${m}m`;
}

export interface CustomerProfilePanelProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leadId: string | null;
  onUpdated?: () => void;
}

export default function CustomerProfilePanel({ open, onOpenChange, leadId, onUpdated }: CustomerProfilePanelProps) {
  const [lead, setLead] = useState<LeadLite | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [customerNotes, setCustomerNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [stage, setStage] = useState<string>("cold");
  const [showSchedule, setShowSchedule] = useState(false);

  const load = async () => {
    if (!leadId) return;
    setLoading(true);
    const { data: l } = await (supabase as any).from("nl_bdr_leads").select("*").eq("id", leadId).maybeSingle();
    if (l) {
      setLead(l as LeadLite);
      setCustomerNotes(l.customer_notes || "");
      setStage(l.pipeline_stage || (l.status === "closed_won" ? "won" : "cold"));
    }
    const { data: ev } = await (supabase as any)
      .from("bdr_calendar_events")
      .select("id, calendar_id, title, starts_at, ends_at, attendance, outcome, notes, source")
      .eq("lead_id", leadId)
      .order("starts_at", { ascending: false });
    setEvents((ev || []) as EventRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open && leadId) load();
    if (!open) { setLead(null); setEvents([]); setShowSchedule(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leadId]);

  const now = Date.now();
  const upcoming = useMemo(() =>
    [...events].filter(e => new Date(e.starts_at).getTime() > now).sort((a,b) => +new Date(a.starts_at) - +new Date(b.starts_at)),
  [events, now]);
  const past = useMemo(() =>
    [...events].filter(e => new Date(e.starts_at).getTime() <= now).sort((a,b) => +new Date(b.starts_at) - +new Date(a.starts_at)),
  [events, now]);
  const next = upcoming[0] || null;
  const countdown = useCountdown(next ? new Date(next.starts_at) : null);

  const saveNotes = async () => {
    if (!lead) return;
    if ((lead.customer_notes || "") === customerNotes) return;
    setSavingNotes(true);
    const { error } = await (supabase as any)
      .from("nl_bdr_leads")
      .update({ customer_notes: customerNotes })
      .eq("id", lead.id);
    setSavingNotes(false);
    if (error) {
      toast({ title: "Couldn't save notes", description: error.message, variant: "destructive" });
    } else {
      setLead({ ...lead, customer_notes: customerNotes });
      onUpdated?.();
    }
  };

  const updateStage = async (newStage: string) => {
    if (!lead) return;
    setStage(newStage);
    const { error } = await (supabase as any)
      .from("nl_bdr_leads")
      .update({ pipeline_stage: newStage })
      .eq("id", lead.id);
    if (error) toast({ title: "Couldn't update stage", description: error.message, variant: "destructive" });
    else { setLead({ ...lead, pipeline_stage: newStage }); onUpdated?.(); }
  };

  const setAttendance = async (eventId: string, value: Attendance) => {
    setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, attendance: value } : e));
    const { error } = await (supabase as any)
      .from("bdr_calendar_events")
      .update({ attendance: value })
      .eq("id", eventId);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      load();
    } else {
      toast({ title: `Marked ${value.replace("_"," ")}` });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-[hsl(215,35%,9%)] border-white/10 text-white p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-white/10">
          <SheetTitle className="text-white">Customer Profile</SheetTitle>
        </SheetHeader>

        {loading || !lead ? (
          <div className="grid place-items-center py-20"><Loader2 className="h-5 w-5 animate-spin text-white/60" /></div>
        ) : (
          <div className="px-5 py-4 space-y-5">
            {/* Customer info */}
            <section className="space-y-2">
              <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-white/50" /><span className="text-sm">{lead.owner_name || "Unknown"}</span></div>
              <div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-white/50" /><span className="text-sm">{lead.business_name}</span></div>
              {lead.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-white/50" /><a href={`tel:${lead.phone}`} className="text-sm hover:underline">{lead.phone}</a></div>}
              {lead.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-white/50" /><a href={`mailto:${lead.email}`} className="text-sm hover:underline truncate">{lead.email}</a></div>}
            </section>

            {/* Pipeline stage */}
            <section className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-white/50">Pipeline stage</Label>
              <Select value={stage} onValueChange={updateStage}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(215,35%,12%)] border-white/10 text-white">
                  {STAGES.map(s => (
                    <SelectItem key={s.key} value={s.key}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                        {s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>

            {/* Next meeting */}
            <section className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-white/50">Next meeting</Label>
              {next ? (
                <div className="rounded-lg border border-[hsl(211,96%,60%)]/30 bg-[hsl(211,96%,56%)]/10 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{fmtDate(new Date(next.starts_at))}</div>
                      <div className="text-xs text-white/70 flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" />{fmtTime(new Date(next.starts_at))} – {fmtTime(new Date(next.ends_at))}</div>
                    </div>
                    {countdown && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 shrink-0">{countdown}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-white/50">No follow-up scheduled.</p>
                  {!showSchedule ? (
                    <Button size="sm" variant="outline" className="bg-white/5 border-white/15 hover:bg-white/10 text-white" onClick={() => setShowSchedule(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Schedule Follow-Up
                    </Button>
                  ) : (
                    <ScheduleFollowUp lead={lead} onCreated={() => { setShowSchedule(false); load(); onUpdated?.(); }} onCancel={() => setShowSchedule(false)} />
                  )}
                </div>
              )}
            </section>

            {/* Meeting history */}
            <section className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-white/50">Meeting history</Label>
              {past.length === 0 ? (
                <p className="text-xs text-white/40">No past meetings yet.</p>
              ) : (
                <div className="space-y-2">
                  {past.map((e) => {
                    const d = new Date(e.starts_at);
                    return (
                      <div key={e.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm">{fmtDate(d)} · {fmtTime(d)}</div>
                          <AttendanceBadge value={e.attendance} />
                        </div>
                        {e.outcome && <div className="text-xs text-white/60">Outcome: {e.outcome}</div>}
                        {e.notes && <div className="text-xs text-white/60 whitespace-pre-wrap">{e.notes}</div>}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {ATTENDANCE_OPTIONS.map(o => (
                            <button key={o.key}
                              onClick={() => setAttendance(e.id, o.key)}
                              className={`text-[11px] px-2 py-1 rounded border transition-colors ${e.attendance === o.key ? "border-white/40 bg-white/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"}`}>
                              {o.key === "attended" && <CheckCircle2 className="h-3 w-3 inline mr-1" style={{ color: o.tone }} />}
                              {o.key === "no_show" && <XCircle className="h-3 w-3 inline mr-1" style={{ color: o.tone }} />}
                              {o.key === "rescheduled" && <RotateCcw className="h-3 w-3 inline mr-1" style={{ color: o.tone }} />}
                              {o.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Customer notes */}
            <section className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-white/50">
                Customer notes {savingNotes && <Loader2 className="h-3 w-3 inline animate-spin ml-1" />}
              </Label>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                onBlur={saveNotes}
                rows={4}
                placeholder="Pain points, what they care about, key context…"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder:text-white/30"
              />
              <p className="text-[10px] text-white/40">Auto-saves on blur. Kept separate from per-call notes.</p>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function AttendanceBadge({ value }: { value: Attendance }) {
  if (value === "pending") return <span className="text-[10px] uppercase tracking-wider text-white/40">Pending</span>;
  const opt = ATTENDANCE_OPTIONS.find(o => o.key === value);
  if (!opt) return null;
  return (
    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: `${opt.tone}22`, color: opt.tone }}>
      {opt.label}
    </span>
  );
}

function ScheduleFollowUp({ lead, onCreated, onCancel }: { lead: LeadLite; onCreated: () => void; onCancel: () => void; }) {
  const tomorrow = new Date(Date.now() + 24*3600_000);
  const [date, setDate] = useState(tomorrow.toISOString().slice(0,10));
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(30);
  const [saving, setSaving] = useState(false);

  const create = async () => {
    setSaving(true);
    const start = new Date(`${date}T${time}`);
    const end = new Date(start.getTime() + duration*60_000);
    const { data: cal } = await (supabase as any).from("bdr_calendars").select("id, client_id").eq("user_id", lead.user_id).maybeSingle();
    if (!cal) {
      setSaving(false);
      toast({ title: "No calendar found", variant: "destructive" });
      return;
    }
    const { error } = await (supabase as any).from("bdr_calendar_events").insert({
      user_id: lead.user_id,
      client_id: (cal as any).client_id || (lead as any).client_id,
      calendar_id: cal.id,
      title: `Follow-up: ${lead.owner_name || lead.business_name}`,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      lead_id: lead.id,
      source: "manual",
      stage: "warm",
      metadata: {
        customer_name: lead.owner_name,
        business_name: lead.business_name,
        phone: lead.phone,
        email: lead.email,
      },
    });
    setSaving(false);
    if (error) { toast({ title: "Couldn't schedule", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Follow-up scheduled" });
    onCreated();
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-white/50">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white/5 border-white/10 text-white h-9" />
        </div>
        <div>
          <Label className="text-[10px] text-white/50">Time</Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-white/5 border-white/10 text-white h-9" />
        </div>
      </div>
      <div>
        <Label className="text-[10px] text-white/50">Duration (min)</Label>
        <Input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 30)} className="bg-white/5 border-white/10 text-white h-9" />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-white/70">Cancel</Button>
        <Button size="sm" onClick={create} disabled={saving} className="bg-[hsl(211,96%,56%)] hover:bg-[hsl(211,96%,48%)]">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Schedule"}
        </Button>
      </div>
    </div>
  );
}
