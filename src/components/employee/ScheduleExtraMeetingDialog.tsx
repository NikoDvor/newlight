import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import AttendeesEditor, { AwayToggle } from "@/components/employee/AttendeesEditor";
import { insertAttendees, type AttendeeDraft } from "@/lib/meetingAttendees";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ensureBdrCalendar } from "@/lib/bdrCalendar";
import { computeAvailableSlots, weeklyMapToRows } from "@/lib/availabilitySlots";

/**
 * "Schedule another meeting" — an extra, tracked meeting with an existing lead
 * (not a reschedule). It gets its own Zoom link + client notice, shows up as
 * "meeting #N" in the journey, and must be closed with an outcome like any
 * other meeting. It never changes the lead's stage — only the forms do.
 * "Away from our Zoom" = no Zoom link and nothing sent to the client/attendees.
 */
export const EXTRA_MEETING_TYPES = [
  { key: "discovery_followup", label: "Discovery follow-up", kind: "discovery", hint: "Another strategy call before Form 2" },
  { key: "closing_followup", label: "Closing follow-up", kind: "closing", hint: "Another closing call before Pay & Sign" },
  { key: "onboarding", label: "Onboarding", kind: "onboarding", hint: "Extra onboarding session" },
  { key: "check_in", label: "Check-in", kind: "check_in", hint: "General check-in with the client" },
] as const;
export type ExtraMeetingType = typeof EXTRA_MEETING_TYPES[number]["key"];

export interface ExtraMeetingLead {
  id: string;
  client_id?: string | null;
  business_name: string;
  owner_name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export default function ScheduleExtraMeetingDialog({
  lead, onClose, onScheduled,
}: { lead: ExtraMeetingLead | null; onClose: () => void; onScheduled?: () => void }) {
  const open = !!lead;
  const [type, setType] = useState<ExtraMeetingType | "">("");
  const [slot, setSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [away, setAway] = useState(false);
  const [awayWhen, setAwayWhen] = useState("");
  const [attendees, setAttendees] = useState<AttendeeDraft[]>([]);
  const [availability, setAvailability] = useState<any>(null);
  const [calTimezone, setCalTimezone] = useState("America/Los_Angeles");

  useEffect(() => {
    if (!open) return;
    setType(""); setSlot(""); setNotes(""); setSaving(false); setAway(false); setAwayWhen(""); setAttendees([]);
    (async () => {
      const cal = await ensureBdrCalendar();
      setAvailability(cal?.availability || null);
      setCalTimezone(cal?.timezone || "America/Los_Angeles");
    })();
  }, [open, lead?.id]);

  const slots = useMemo(() => {
    if (!availability) return [];
    return computeAvailableSlots(weeklyMapToRows(availability), {
      durationMinutes: 60, slotIntervalMinutes: 30, minNoticeMinutes: 0, daysAhead: 14, timeZone: calTimezone,
    }).map((d) => ({ date: d, label: d.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) }));
  }, [availability, calTimezone]);

  const startIso = away ? (awayWhen ? new Date(awayWhen).toISOString() : "") : slot;
  const submit = async () => {
    if (!lead || !type || !startIso) return;
    const def = EXTRA_MEETING_TYPES.find((t) => t.key === type)!;
    setSaving(true);
    try {
      const cal = await ensureBdrCalendar();
      if (!cal) throw new Error("No calendar found");
      const start = new Date(startIso);
      const end = new Date(start.getTime() + 60 * 60_000);
      const { data: created, error } = await (supabase as any).from("bdr_calendar_events").insert({
        user_id: (cal as any).user_id,
        client_id: lead.client_id || (cal as any).client_id,
        calendar_id: (cal as any).id,
        lead_id: lead.id,
        title: `${def.label}: ${lead.business_name}`,
        description: notes.trim() || null,
        notes: notes.trim() || null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        source: "extra_meeting",
        meeting_kind: def.kind,
        is_extra: true,
        extra_type: def.key,
        is_external: away,
        attendance: "pending",
        metadata: {
          customer_name: lead.owner_name || null,
          business_name: lead.business_name,
          phone: lead.phone || null,
          email: lead.email || null,
          extra_type: def.key,
        },
      }).select("id").single();
      if (error) throw error;

      if (attendees.length) {
        try { await insertAttendees(created.id, lead.id, attendees); }
        catch (e: any) { toast({ title: "Meeting scheduled, but attendees didn't save", description: e?.message, variant: "destructive" }); }
      }

      // Zoom link + client/rep notice (fire-and-forget; never blocks scheduling).
      supabase.functions
        .invoke("meeting-reschedule-notice", { body: { event_id: created.id, mode: "scheduled" } })
        .then(({ error: nErr }) => { if (nErr) console.error("extra meeting notice failed", nErr); })
        .catch((e) => console.error("extra meeting notice failed", e));

      toast({ title: `${def.label} scheduled`, description: start.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) });
      onScheduled?.();
      onClose();
    } catch (e: any) {
      toast({ title: "Could not schedule", description: e?.message || "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-w-md max-h-[88dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule another meeting</DialogTitle>
          <DialogDescription>
            {lead?.business_name} — an extra meeting (not a reschedule). It gets its own Zoom link, the client is notified
            (unless it's away from our Zoom), and you'll log its outcome afterwards. The lead's stage doesn't change.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Meeting type</Label>
            <div className="grid grid-cols-2 gap-2">
              {EXTRA_MEETING_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  className={`text-left text-xs px-3 py-2 rounded-md border transition-colors ${type === t.key ? "border-primary bg-primary/15 text-foreground" : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}
                >
                  <span className="block font-semibold">{t.label}</span>
                  <span className="block text-[10px] opacity-70">{t.hint}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <AwayToggle value={away} onChange={setAway} className="mb-2" />
            <Label className="text-xs">Time (1-hour block)</Label>
            {away ? (
              <Input type="datetime-local" value={awayWhen} onChange={(e) => setAwayWhen(e.target.value)} />
            ) : slots.length === 0 ? (
              <p className="text-xs text-muted-foreground">{availability ? "No open times in the next 14 days." : "No availability configured on your calendar yet."}</p>
            ) : (
              <select value={slot} onChange={(e) => setSlot(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm">
                <option value="">— Select a time —</option>
                {slots.map((s) => <option key={s.date.toISOString()} value={s.date.toISOString()}>{s.label}</option>)}
              </select>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="What's this meeting for?" />
          </div>
          <AttendeesEditor leadId={lead?.id || null} value={attendees} onChange={setAttendees} away={away} />
          <Button className="w-full" disabled={!type || !startIso || saving} onClick={submit}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Schedule meeting
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
