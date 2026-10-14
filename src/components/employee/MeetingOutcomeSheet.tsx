import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ensureBdrCalendar } from "@/lib/bdrCalendar";
import { computeAvailableSlots, weeklyMapToRows } from "@/lib/availabilitySlots";
import { rescheduleMeeting } from "@/lib/meetingReschedule";
import {
  LOST_REASONS, MEETING_KINDS, RESCHEDULE_REASONS,
  type LostReason, type MeetingKind, type RescheduleReason,
} from "@/lib/meetingOutcomes";

export interface OutcomeEvent {
  id: string;
  lead_id: string | null;
  meeting_kind: string | null;
  attempt_number: number | null;
  starts_at: string;
  source?: string | null;
}
export interface OutcomeLead {
  id: string;
  client_id?: string | null;
  business_name: string;
  crm_deal_id?: string | null;
}
export interface OutcomeRow {
  id: string;
  event_id: string;
  lead_id: string | null;
  meeting_kind: string;
  attempt_number: number;
  result: "won" | "rescheduled" | "lost";
  next_step: string | null;
  primary_lost_reason: string | null;
  reschedule_reason: string | null;
  logged_at: string;
  next_event?: { starts_at: string; attempt_number: number | null; meeting_kind: string | null } | null;
}

export const OUTCOME_SELECT =
  "id, event_id, lead_id, meeting_kind, attempt_number, result, next_step, primary_lost_reason, reschedule_reason, logged_at, next_event:bdr_calendar_events!bdr_meeting_outcomes_next_event_id_fkey(starts_at, attempt_number, meeting_kind)";

export const OUTCOME_KINDS = ["discovery", "closing", "onboarding"] as const;

const KIND_SHORT: Record<string, string> = { discovery: "Discovery", closing: "Closing", onboarding: "Onboarding", pay_sign: "Pay & Sign" };
const NEXT_LABEL: Record<string, string> = { form_2: "Form 2", form_3: "Pay & Sign", activated: "Activated" };

export function kindAttemptLabel(kind: string | null | undefined, attempt: number | null | undefined) {
  return `${KIND_SHORT[kind || ""] || "Meeting"} #${attempt ?? 1}`;
}

/** Event needs an outcome: tracked kind, start passed, not rescheduled, no outcome yet. */
export function needsOutcome(
  e: { meeting_kind?: string | null; starts_at: string; attendance?: string | null } | undefined | null,
  hasOutcome: boolean,
) {
  if (!e || hasOutcome) return false;
  if (!OUTCOME_KINDS.includes((e.meeting_kind || "") as any)) return false;
  if (e.attendance === "rescheduled") return false;
  return new Date(e.starts_at).getTime() < Date.now();
}

export function formatOutcomeSummary(o: OutcomeRow) {
  const head = kindAttemptLabel(o.meeting_kind, o.attempt_number);
  if (o.result === "lost") {
    const r = o.primary_lost_reason ? LOST_REASONS[o.primary_lost_reason as LostReason] || o.primary_lost_reason : "";
    return `${head} · Lost${r ? ` — ${r}` : ""}`;
  }
  if (o.result === "rescheduled") {
    const n = o.next_event;
    if (n) {
      const d = new Date(n.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return `${head} · Rescheduled → ${kindAttemptLabel(n.meeting_kind || o.meeting_kind, n.attempt_number)} ${d}`;
    }
    return `${head} · Rescheduled`;
  }
  return `${head} · Won${o.next_step ? ` → ${NEXT_LABEL[o.next_step] || o.next_step}` : ""}`;
}

type Attendance = "attended" | "no_show";
type Result = "won" | "rescheduled" | "lost";

interface Props {
  event: OutcomeEvent | null;
  lead: OutcomeLead | null;
  /** "pay_sign" = stalled Pay & Sign after a won closing: only Lost or Still waiting. */
  mode?: "meeting" | "pay_sign";
  onDone: () => void;
  onCancel?: () => void;
}

export default function MeetingOutcomeSheet({ event, lead, mode = "meeting", onDone, onCancel }: Props) {
  const navigate = useNavigate();
  const open = !!event && !!lead;
  const isPaySign = mode === "pay_sign";
  const kind = (event?.meeting_kind || "discovery") as MeetingKind;
  const attempt = event?.attempt_number ?? 1;

  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<any>(null);
  const [calTimezone, setCalTimezone] = useState("America/Los_Angeles");
  const [slot, setSlot] = useState("");
  const [reason, setReason] = useState<RescheduleReason | "">("");
  const [primary, setPrimary] = useState<LostReason | "">("");
  const [others, setOthers] = useState<Set<LostReason>>(new Set());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setAttendance(null); setResult(isPaySign ? "lost" : null); setSlot(""); setReason("");
    setPrimary(""); setOthers(new Set()); setNotes(""); setSaving(false);
  }, [open, event?.id, isPaySign]);

  useEffect(() => {
    if (attendance === "no_show") {
      setReason("no_show");
      if (result === "won") setResult(null);
    } else if (reason === "no_show") setReason("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendance]);

  useEffect(() => {
    if (!open || result !== "rescheduled" || availability) return;
    (async () => {
      const cal = await ensureBdrCalendar();
      setAvailability(cal?.availability || null);
      setCalTimezone(cal?.timezone || "America/Los_Angeles");
    })();
  }, [open, result, availability]);

  const slots = useMemo(() => {
    if (!availability) return [];
    return computeAvailableSlots(weeklyMapToRows(availability), {
      durationMinutes: 60, slotIntervalMinutes: 30, minNoticeMinutes: 0, daysAhead: 14, timeZone: calTimezone,
    }).map((d) => ({ date: d, label: d.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) }));
  }, [availability, calTimezone]);

  if (!open || !event || !lead) return null;

  const title = isPaySign
    ? `Pay & Sign — ${lead.business_name}`
    : `${MEETING_KINDS[kind]?.split(" (")[0] || "Meeting"} #${attempt} — ${lead.business_name}`;

  const baseRow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    return {
      client_id: lead.client_id ?? null,
      event_id: event.id,
      lead_id: event.lead_id ?? lead.id,
      rep_user_id: user.id,
      meeting_kind: isPaySign ? "pay_sign" : kind,
      attempt_number: attempt,
      attendance: isPaySign ? null : attendance,
    };
  };

  const insertOutcome = async (extra: Record<string, unknown>) => {
    const row = { ...(await baseRow()), ...extra };
    const { error } = await (supabase as any).from("bdr_meeting_outcomes").insert(row);
    if (error) throw new Error(error.message);
  };
  const setEventAttendance = async (value: string) => {
    const { error } = await (supabase as any).from("bdr_calendar_events").update({ attendance: value }).eq("id", event.id);
    if (error) throw new Error(error.message);
  };

  const run = async (fn: () => Promise<void>) => {
    setSaving(true);
    try { await fn(); } catch (e: any) {
      toast({ title: "Could not save outcome", description: e?.message || "Try again.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const saveWon = () => run(async () => {
    if (kind === "discovery") {
      navigate(`/employee/close-prep/${lead.id}?event=${event.id}`);
      onDone();
      return;
    }
    if (kind === "closing") {
      await insertOutcome({ result: "won", next_step: "form_3" });
      await setEventAttendance("attended");
      toast({ title: "Closing won — send Pay & Sign" });
      onDone();
      navigate(`/employee/pay-sign/${lead.crm_deal_id || lead.id}`);
      return;
    }
    // onboarding
    await insertOutcome({ result: "won", next_step: "activated" });
    await setEventAttendance("attended");
    if (lead.crm_deal_id) {
      supabase.functions
        .invoke("mark-fully-activated", { body: { deal_id: lead.crm_deal_id } })
        .then(({ error }) => { if (error) console.error("mark-fully-activated failed", error); })
        .catch((e) => console.error("mark-fully-activated failed", e));
    }
    toast({ title: "Onboarding complete — client activated" });
    onDone();
  });

  const saveReschedule = () => run(async () => {
    if (!slot || !reason) throw new Error("Pick a new time and a reason.");
    const newId = await rescheduleMeeting({
      eventId: event.id,
      lead: { id: lead.id, client_id: lead.client_id ?? null, business_name: lead.business_name },
      start: new Date(slot),
      durationMinutes: 60,
    });
    await insertOutcome({ result: "rescheduled", reschedule_reason: reason, next_event_id: newId });
    toast({ title: "Meeting rescheduled" });
    onDone();
  });

  const saveLost = () => run(async () => {
    if (!primary) throw new Error("Pick the main reason.");
    const all = [primary, ...Array.from(others).filter((r) => r !== primary)];
    await insertOutcome({
      result: "lost", primary_lost_reason: primary, lost_reasons: all, notes: notes.trim() || null,
    });
    if (!isPaySign && attendance) await setEventAttendance(attendance);

    const { data: fresh } = await (supabase as any).from("nl_bdr_leads")
      .select("outcome_history, crm_deal_id").eq("id", lead.id).maybeSingle();
    const history = Array.isArray(fresh?.outcome_history) ? fresh.outcome_history : [];
    const label = `Lost at ${isPaySign ? "Pay & Sign" : `${KIND_SHORT[kind]} #${attempt}`} — ${LOST_REASONS[primary]}`;
    const entry = { label, timestamp: new Date().toISOString(), meeting_kind: isPaySign ? "pay_sign" : kind };
    const { error: leadErr } = await (supabase as any).from("nl_bdr_leads")
      .update({ status: "closed_lost", pipeline_stage: "cold", outcome_history: [...history, entry] })
      .eq("id", lead.id);
    if (leadErr) throw new Error(leadErr.message);

    const dealId = fresh?.crm_deal_id || lead.crm_deal_id;
    if (dealId) {
      await (supabase as any).from("crm_deals")
        .update({ status: "lost", lost_at: new Date().toISOString() }).eq("id", dealId);
    }
    toast({ title: "Marked lost" });
    onDone();
  });

  const stillWaiting = () => {
    try { localStorage.setItem(`nl_paysign_snooze_${event.id}`, String(Date.now() + 7 * 86400_000)); } catch { /* ignore */ }
    onDone();
  };

  const cancel = () => { if (!saving) (onCancel ?? onDone)(); };

  const chip = (active: boolean) =>
    `text-xs px-3 py-1.5 rounded-md border transition-colors ${active ? "border-primary bg-primary/15 text-foreground" : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"}`;

  return (
    <Sheet open={open} onOpenChange={() => { /* closing only via Cancel or save */ }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {new Date(event.starts_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {!isPaySign && (
            <div className="space-y-2">
              <Label className="text-xs">1. Did the meeting happen?</Label>
              <div className="flex gap-2">
                <button className={chip(attendance === "attended")} onClick={() => setAttendance("attended")}>Attended</button>
                <button className={chip(attendance === "no_show")} onClick={() => setAttendance("no_show")}>No-show</button>
              </div>
            </div>
          )}

          {(isPaySign || attendance) && (
            <div className="space-y-2">
              <Label className="text-xs">{isPaySign ? "Outcome" : "2. Result"}</Label>
              <div className="flex flex-wrap gap-2">
                {!isPaySign && attendance === "attended" && (
                  <button className={chip(result === "won")} onClick={() => setResult("won")}>
                    {kind === "onboarding" ? "Completed" : "Won"}
                  </button>
                )}
                {!isPaySign && <button className={chip(result === "rescheduled")} onClick={() => setResult("rescheduled")}>Reschedule</button>}
                <button className={chip(result === "lost")} onClick={() => setResult("lost")}>Lost</button>
              </div>
            </div>
          )}

          {result === "won" && attendance === "attended" && !isPaySign && (
            <Button className="w-full" disabled={saving} onClick={saveWon}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {kind === "discovery" ? "Fill out Form 2" : kind === "closing" ? "Won — send Pay & Sign" : "Completed — activate client"}
            </Button>
          )}

          {result === "rescheduled" && !isPaySign && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">New time (1-hour block)</Label>
                {slots.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{availability ? "No open times in the next 14 days." : "No availability configured on your calendar yet."}</p>
                ) : (
                  <select value={slot} onChange={(e) => setSlot(e.target.value)}
                    className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-sm text-foreground">
                    <option value="">— Select a time —</option>
                    {slots.map((s) => <option key={s.date.toISOString()} value={s.date.toISOString()}>{s.label}</option>)}
                  </select>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reason</Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(RESCHEDULE_REASONS) as RescheduleReason[]).map((k) => (
                    <button key={k} disabled={attendance === "no_show" && k !== "no_show"}
                      className={`${chip(reason === k)} disabled:opacity-40`}
                      onClick={() => attendance !== "no_show" && setReason(k)}>
                      {RESCHEDULE_REASONS[k]}
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full" disabled={saving || !slot || !reason} onClick={saveReschedule}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save reschedule
              </Button>
            </div>
          )}

          {result === "lost" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Main reason (required)</Label>
                <select value={primary} onChange={(e) => setPrimary(e.target.value as LostReason)}
                  className="w-full bg-muted/30 border border-border rounded-md px-3 py-2 text-sm text-foreground">
                  <option value="">— Select —</option>
                  {(Object.keys(LOST_REASONS) as LostReason[]).map((k) => <option key={k} value={k}>{LOST_REASONS[k]}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Other reasons (optional)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(LOST_REASONS) as LostReason[]).filter((k) => k !== primary).map((k) => (
                    <button key={k} className={chip(others.has(k))}
                      onClick={() => setOthers((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; })}>
                      {LOST_REASONS[k]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Note (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
              <Button variant="destructive" className="w-full" disabled={saving || !primary} onClick={saveLost}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save as lost
              </Button>
            </div>
          )}

          {isPaySign && (
            <Button variant="outline" className="w-full" disabled={saving} onClick={stillWaiting}>
              Still waiting — remind me in 7 days
            </Button>
          )}

          <Button variant="ghost" className="w-full" disabled={saving} onClick={cancel}>Cancel</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── Dashboard card: meetings needing an outcome + stalled Pay & Sign ─── */

interface PendingItem {
  key: string;
  mode: "meeting" | "pay_sign";
  event: OutcomeEvent;
  lead: OutcomeLead;
  label: string;
}

export function MeetingsNeedingOutcomeCard({ className }: { className?: string }) {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [active, setActive] = useState<PendingItem | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = supabase as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const nowIso = new Date().toISOString();

      const { data: evts } = await db.from("bdr_calendar_events")
        .select("id, lead_id, meeting_kind, attempt_number, starts_at, source, attendance")
        .eq("user_id", user.id)
        .in("meeting_kind", OUTCOME_KINDS as unknown as string[])
        .lt("starts_at", nowIso)
        .not("lead_id", "is", null)
        .or("attendance.is.null,attendance.neq.rescheduled")
        .order("starts_at", { ascending: false })
        .limit(200);
      const evIds = (evts || []).map((e: any) => e.id);
      const logged = new Set<string>();
      if (evIds.length) {
        const { data: outs } = await db.from("bdr_meeting_outcomes").select("event_id, meeting_kind").in("event_id", evIds);
        (outs || []).forEach((o: any) => { if (o.meeting_kind !== "pay_sign") logged.add(o.event_id); });
      }
      const pending = (evts || []).filter((e: any) => !logged.has(e.id));

      // Stalled Pay & Sign
      const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
      const { data: wonClosings } = await db.from("bdr_meeting_outcomes")
        .select("event_id, lead_id, attempt_number, logged_at")
        .eq("rep_user_id", user.id).eq("meeting_kind", "closing").eq("result", "won")
        .lt("logged_at", weekAgo).limit(200);
      let stalled: any[] = wonClosings || [];
      if (stalled.length) {
        const { data: ps } = await db.from("bdr_meeting_outcomes").select("event_id")
          .eq("meeting_kind", "pay_sign").in("event_id", stalled.map((s) => s.event_id));
        const done = new Set((ps || []).map((p: any) => p.event_id));
        stalled = stalled.filter((s) => !done.has(s.event_id) && !isSnoozed(s.event_id));
      }

      const leadIds = Array.from(new Set([...pending.map((e: any) => e.lead_id), ...stalled.map((s) => s.lead_id)].filter(Boolean)));
      const leadMap = new Map<string, any>();
      if (leadIds.length) {
        const { data: lds } = await db.from("nl_bdr_leads").select("id, client_id, business_name, crm_deal_id").in("id", leadIds);
        (lds || []).forEach((l: any) => leadMap.set(l.id, l));
      }
      const dealIds = stalled.map((s) => leadMap.get(s.lead_id)?.crm_deal_id).filter(Boolean);
      const paid = new Set<string>();
      if (dealIds.length) {
        const { data: deals } = await db.from("crm_deals").select("id, pay_sign_status").in("id", dealIds);
        (deals || []).forEach((d: any) => { if (d.pay_sign_status === "paid_signed") paid.add(d.id); });
      }

      const out: PendingItem[] = [];
      pending.forEach((e: any) => {
        const l = leadMap.get(e.lead_id); if (!l) return;
        out.push({ key: e.id, mode: "meeting", event: e, lead: l, label: kindAttemptLabel(e.meeting_kind, e.attempt_number) });
      });
      stalled.forEach((s) => {
        const l = leadMap.get(s.lead_id); if (!l) return;
        if (l.crm_deal_id && paid.has(l.crm_deal_id)) return;
        out.push({
          key: `ps-${s.event_id}`, mode: "pay_sign",
          event: { id: s.event_id, lead_id: s.lead_id, meeting_kind: "closing", attempt_number: s.attempt_number, starts_at: s.logged_at },
          lead: l, label: "Pay & Sign stalled",
        });
      });
      if (!cancelled) setItems(out);
    })().catch((e) => console.error("[MeetingsNeedingOutcome] load failed", e));
    return () => { cancelled = true; };
  }, [reload]);

  if (items.length === 0) return null;

  return (
    <Card className={`p-5 border-destructive/40 ${className ?? ""}`}>
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
        <ClipboardCheck className="h-4 w-4 text-destructive" /> Meetings needing an outcome ({items.length})
      </h2>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.key} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm text-foreground truncate">{it.lead.business_name}</p>
              <p className="text-xs text-muted-foreground">
                {it.label} · {new Date(it.event.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </p>
            </div>
            <Button size="sm" variant={it.mode === "pay_sign" ? "outline" : "default"} onClick={() => setActive(it)}>
              {it.mode === "pay_sign" ? "Update" : "Log outcome"}
            </Button>
          </div>
        ))}
      </div>
      <MeetingOutcomeSheet
        event={active?.event ?? null}
        lead={active?.lead ?? null}
        mode={active?.mode}
        onCancel={() => setActive(null)}
        onDone={() => { setActive(null); setReload((n) => n + 1); }}
      />
    </Card>
  );
}

function isSnoozed(eventId: string) {
  try {
    const v = localStorage.getItem(`nl_paysign_snooze_${eventId}`);
    return !!v && Number(v) > Date.now();
  } catch { return false; }
}
