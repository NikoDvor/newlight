import { useEffect, useState } from "react";
import { Plus, X, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { attendeeDraftValid, fetchLeadAttendeeSuggestions, type AttendeeDraft } from "@/lib/meetingAttendees";

/**
 * "Meeting away from our Zoom" switch. On = in person, by phone, or on the
 * client's own calendar: no Zoom link, and the client + attendees get no
 * emails, texts or reminders. The meeting is tracked exactly the same.
 */
export function AwayToggle({ value, onChange, className = "" }: { value: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <label className={`flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-muted/20 cursor-pointer ${className}`}>
      <Switch checked={value} onCheckedChange={onChange} className="mt-0.5" />
      <span className="text-xs leading-snug">
        <span className="block font-semibold text-foreground">Meeting away from our Zoom</span>
        <span className="block text-muted-foreground">
          In person, by phone, or on their calendar. No Zoom link, and nothing is emailed or texted to the client or attendees. Still tracked the same.
        </span>
      </span>
    </label>
  );
}

const empty: AttendeeDraft = { name: "", email: "", phone: "" };

/**
 * Draft list of extra attendees for a meeting that doesn't exist yet
 * (Form 2, + Meeting). Shows people from this lead's earlier meetings for
 * one-tap reuse.
 */
export default function AttendeesEditor({
  leadId, value, onChange, away = false,
}: { leadId?: string | null; value: AttendeeDraft[]; onChange: (v: AttendeeDraft[]) => void; away?: boolean }) {
  const [suggestions, setSuggestions] = useState<AttendeeDraft[]>([]);

  useEffect(() => {
    if (!leadId) { setSuggestions([]); return; }
    fetchLeadAttendeeSuggestions(leadId).then(setSuggestions);
  }, [leadId]);

  const keyOf = (a: AttendeeDraft) => (a.email || a.phone || a.name).toLowerCase();
  const unused = suggestions.filter((s) => !value.some((v) => keyOf(v) === keyOf(s)));
  const set = (i: number, patch: Partial<AttendeeDraft>) => onChange(value.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-foreground">Extra attendees</div>
        <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onChange([...value, { ...empty }])}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add attendee
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {away
          ? "Saved on the meeting for your records — nothing is sent because it's away from our Zoom."
          : "They get the same confirmation, Zoom link and reminders by email, with a link to turn on text reminders."}
      </p>
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unused.map((s) => (
            <button key={keyOf(s)} type="button" onClick={() => onChange([...value, s])}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-border bg-muted/30 hover:bg-muted/60">
              <UserPlus className="h-3 w-3" /> {s.name}
            </button>
          ))}
        </div>
      )}
      {value.map((a, i) => {
        const bad = (a.name || a.email || a.phone) && !attendeeDraftValid(a);
        return (
          <div key={i} className="rounded-md border border-border/60 p-2 space-y-1.5">
            <div className="flex gap-1.5">
              <Input value={a.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Name" className="h-8 text-sm" />
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Input type="email" value={a.email} onChange={(e) => set(i, { email: e.target.value })} placeholder="Email" className="h-8 text-sm" />
              <Input type="tel" value={a.phone} onChange={(e) => set(i, { phone: e.target.value })} placeholder="Phone" className="h-8 text-sm" />
            </div>
            {bad && <p className="text-[11px] text-red-400">Add a name and a valid email or phone.</p>}
          </div>
        );
      })}
    </div>
  );
}
