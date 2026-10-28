import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import AttendeesEditor from "@/components/employee/AttendeesEditor";
import { insertAttendees, type AttendeeDraft } from "@/lib/meetingAttendees";
import { TEAM_SIZES, form1Modules } from "@/lib/form1Modules";

export interface ExternalMeetingLead {
  id: string;
  business_name: string;
  owner_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

/**
 * "Log meeting booked elsewhere" — a first meeting booked outside the app
 * (in person, by phone, on the client's own calendar). Counts as Form 1:
 * the lead moves to Warm and the meeting is tracked as Discovery #1 with an
 * outcome to log afterwards. It's away from our Zoom, so the client gets no
 * emails or texts now; their login goes out with Form 2.
 * Pass a lead to log it on an existing lead, or null to create a new lead.
 */
export default function LogExternalMeetingDialog({
  open, lead, onClose, onLogged,
}: { open: boolean; lead: ExternalMeetingLead | null; onClose: () => void; onLogged?: (leadId: string) => void }) {
  const [business, setBusiness] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState("60");
  const [salesTeam, setSalesTeam] = useState<"" | "yes" | "no">("");
  const [teamSize, setTeamSize] = useState("");
  const [compliance, setCompliance] = useState<"" | "yes" | "no">("");
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState<AttendeeDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBusiness(lead?.business_name || "");
    setName(lead?.owner_name || "");
    setEmail(lead?.email || "");
    setPhone(lead?.phone || "");
    setWhen(""); setDuration("60"); setSalesTeam(""); setTeamSize(""); setCompliance(""); setNotes(""); setAttendees([]);
    setSaving(false);
  }, [open, lead?.id]);

  const valid =
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    phone.replace(/\D/g, "").length >= 10 &&
    !!when && (!!lead || business.trim().length > 0);

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const { data, error } = await (supabase as any).rpc("nl_log_external_first_meeting", {
        _lead_id: lead?.id || null,
        _business_name: lead ? null : business.trim(),
        _customer_name: name.trim(),
        _email: email.trim(),
        _phone: phone.trim(),
        _starts_at: new Date(when).toISOString(),
        _duration_minutes: Number(duration) || 60,
        _modules: form1Modules(salesTeam, compliance),
        _has_sales_team: salesTeam === "" ? null : salesTeam === "yes",
        _sales_team_size: salesTeam === "yes" ? teamSize || null : null,
        _notes: [notes.trim(), compliance ? `Compliance restrictions: ${compliance}` : ""].filter(Boolean).join("\n") || null,
      });
      if (error) throw new Error(error.message);
      if (attendees.length && data?.event_id) {
        try { await insertAttendees(data.event_id, data.lead_id, attendees); }
        catch (e: any) { toast({ title: "Meeting logged, but attendees didn't save", description: e?.message, variant: "destructive" }); }
      }
      toast({ title: "First meeting logged", description: "Lead is now Warm. Log the outcome after the meeting like any other." });
      onLogged?.(data?.lead_id);
      onClose();
    } catch (e: any) {
      toast({ title: "Couldn't log the meeting", description: e?.message || "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const yn = (val: "" | "yes" | "no", set: (v: "yes" | "no") => void) => (
    <div className="grid grid-cols-2 gap-2 mt-1">
      {(["yes", "no"] as const).map((v) => (
        <Button key={v} type="button" variant="outline" size="sm" onClick={() => set(v)}
          className={val === v ? "border-primary bg-primary/15" : "text-muted-foreground"}>
          {v === "yes" ? "Yes" : "No"}
        </Button>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-w-md max-h-[88dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log meeting booked elsewhere</DialogTitle>
          <DialogDescription>
            First meeting booked in person, by phone, or on their calendar. Counts as Form 1 (lead → Warm). Away from our Zoom,
            so the client isn't emailed or texted. Their login goes out with Form 2.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!lead && (
            <div>
              <Label className="text-xs">Business name <span className="text-red-500">*</span></Label>
              <Input value={business} onChange={(e) => setBusiness(e.target.value)} />
            </div>
          )}
          {lead && <div className="text-sm font-semibold">{lead.business_name}</div>}
          <div>
            <Label className="text-xs">Client name <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Email <span className="text-red-500">*</span></Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Phone <span className="text-red-500">*</span></Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label className="text-xs">Date &amp; time <span className="text-red-500">*</span></Label>
              <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Minutes</Label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full h-10 bg-background border border-input rounded-md px-2 text-sm">
                {["15", "30", "45", "60", "90"].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Do they have a sales team?</Label>
            {yn(salesTeam, setSalesTeam)}
          </div>
          {salesTeam === "yes" && (
            <div>
              <Label className="text-xs">Sales team size</Label>
              <select value={teamSize} onChange={(e) => setTeamSize(e.target.value)} className="w-full h-10 bg-background border border-input rounded-md px-2 text-sm">
                <option value="">— Select —</option>
                {TEAM_SIZES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
          <div>
            <Label className="text-xs">Do they have compliance restrictions?</Label>
            {yn(compliance, setCompliance)}
          </div>
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Where / how is the meeting happening?" />
          </div>
          <AttendeesEditor leadId={lead?.id || null} value={attendees} onChange={setAttendees} away />
          <Button className="w-full" disabled={!valid || saving} onClick={submit}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Log first meeting
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
