import { useEffect, useState } from "react";
import { Loader2, Plus, X, UserPlus, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { AwayToggle } from "@/components/employee/AttendeesEditor";
import {
  attendeeDraftValid, fetchAttendees, fetchLeadAttendeeSuggestions, insertAttendees, notifyAttendees,
  type Attendee, type AttendeeDraft,
} from "@/lib/meetingAttendees";

/**
 * Live settings for an existing tracked meeting (calendar event detail):
 *  - "Meeting away from our Zoom" switch. Turning it ON stops all client and
 *    attendee messages for this meeting. Turning it OFF creates a Zoom link
 *    and sends the client + attendees the confirmation (upcoming meetings only).
 *  - Extra attendees: add (they're emailed the confirmation right away on Zoom
 *    meetings), reuse people from this lead's earlier meetings, remove.
 */
export default function MeetingSetupPanel({
  eventId, leadId, startsAt, initialAway, onChanged,
}: { eventId: string; leadId: string; startsAt: string; initialAway: boolean; onChanged?: () => void }) {
  const [away, setAway] = useState(initialAway);
  const [savingAway, setSavingAway] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [suggestions, setSuggestions] = useState<AttendeeDraft[]>([]);
  const [draft, setDraft] = useState<AttendeeDraft | null>(null);
  const [adding, setAdding] = useState(false);
  const upcoming = new Date(startsAt).getTime() > Date.now();

  const load = async () => {
    // Read the switch fresh — the calendar list may be stale after a toggle.
    const { data: ev } = await (supabase as any).from("bdr_calendar_events").select("is_external").eq("id", eventId).maybeSingle();
    if (ev) setAway(!!ev.is_external);
    setAttendees(await fetchAttendees(eventId));
    setSuggestions(await fetchLeadAttendeeSuggestions(leadId));
  };
  useEffect(() => { setAway(initialAway); load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [eventId]);

  const toggleAway = async (next: boolean) => {
    setSavingAway(true);
    const { error } = await (supabase as any).from("bdr_calendar_events").update({ is_external: next }).eq("id", eventId);
    setSavingAway(false);
    if (error) { toast({ title: "Couldn't update meeting", description: error.message, variant: "destructive" }); return; }
    setAway(next);
    if (!next && upcoming) {
      // Back on our Zoom: new link + confirmation to the client and attendees.
      supabase.functions.invoke("meeting-reschedule-notice", { body: { event_id: eventId, mode: "scheduled" } })
        .then(({ error: e }) => { if (e) console.error("notice failed", e); });
      toast({ title: "Back on our Zoom", description: "A Zoom link was created and the client + attendees were sent the confirmation." });
    } else {
      toast({ title: next ? "Away from our Zoom" : "On our Zoom", description: next ? "No more emails, texts or reminders go to the client or attendees for this meeting." : undefined });
    }
    onChanged?.();
  };

  const add = async (d: AttendeeDraft) => {
    if (!attendeeDraftValid(d)) return;
    setAdding(true);
    try {
      const [row] = await insertAttendees(eventId, leadId, [d]);
      if (row && !away && upcoming) notifyAttendees(eventId, row.id);
      toast({ title: `${d.name} added`, description: !away && upcoming ? "They've been emailed the meeting details." : "Saved on the meeting." });
      setDraft(null);
      await load();
    } catch (e: any) {
      toast({ title: "Couldn't add attendee", description: e?.message, variant: "destructive" });
    } finally { setAdding(false); }
  };

  const remove = async (a: Attendee) => {
    const { error } = await (supabase as any).from("bdr_meeting_attendees").delete().eq("id", a.id);
    if (error) { toast({ title: "Couldn't remove", description: error.message, variant: "destructive" }); return; }
    setAttendees((xs) => xs.filter((x) => x.id !== a.id));
  };

  const keyOf = (a: { name: string; email?: string | null; phone?: string | null }) => (a.email || a.phone || a.name).toLowerCase();
  const unused = suggestions.filter((s) => !attendees.some((a) => keyOf(a) === keyOf(s)));

  return (
    <div className="space-y-3 pt-3 border-t border-white/10">
      <div className="relative">
        <AwayToggle value={away} onChange={toggleAway} />
        {savingAway && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-white/50" />}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold">Extra attendees</div>
          {!draft && (
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDraft({ name: "", email: "", phone: "" })}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add attendee
            </Button>
          )}
        </div>
        {attendees.length === 0 && !draft && <p className="text-[11px] text-white/45">Nobody extra on this meeting.</p>}
        {attendees.map((a) => (
          <div key={a.id} className="flex items-center gap-2 text-xs rounded-md bg-white/5 px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{a.name}</div>
              <div className="text-white/50 truncate">{[a.email, a.phone].filter(Boolean).join(" · ")}</div>
            </div>
            {a.sms_consent && <span title="Texts on" className="text-[10px] text-emerald-400 inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />Texts</span>}
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(a)}><X className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
        {unused.length > 0 && !draft && (
          <div className="flex flex-wrap gap-1.5">
            {unused.map((s) => (
              <button key={keyOf(s)} type="button" disabled={adding} onClick={() => add(s)}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10">
                <UserPlus className="h-3 w-3" /> {s.name}
              </button>
            ))}
          </div>
        )}
        {draft && (
          <div className="rounded-md border border-white/10 p-2 space-y-1.5">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" className="h-8 text-sm bg-white/5 border-white/10" />
            <div className="grid grid-cols-2 gap-1.5">
              <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="Email" className="h-8 text-sm bg-white/5 border-white/10" />
              <Input type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="Phone" className="h-8 text-sm bg-white/5 border-white/10" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
              <Button type="button" size="sm" disabled={adding || !attendeeDraftValid(draft)} onClick={() => add(draft)}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
              </Button>
            </div>
          </div>
        )}
        {!away && <p className="text-[10px] text-white/40">Attendees get the confirmation, Zoom link and reminders by email, plus a link to turn on texts.</p>}
      </div>
    </div>
  );
}
