import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}

const SENTIMENTS = [
  { v: "positive", l: "Positive" },
  { v: "neutral", l: "Neutral" },
  { v: "negative", l: "Negative" },
];

const empty = {
  contact_id: "",
  title: "",
  meeting_date: new Date().toISOString().slice(0, 16),
  transcript: "",
  summary: "",
  action_items: "",
  next_steps: "",
  sentiment: "neutral",
};

export function ManualMeetingNotesDialog({ open, onOpenChange, onSaved }: Props) {
  const { activeClientId } = useWorkspace();
  const [contacts, setContacts] = useState<any[]>([]);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !activeClientId) return;
    supabase.from("crm_contacts")
      .select("id, full_name, email")
      .eq("client_id", activeClientId)
      .order("full_name")
      .then(({ data }) => setContacts(data ?? []));
  }, [open, activeClientId]);

  useEffect(() => { if (open) setForm({ ...empty }); }, [open]);

  const splitLines = (s: string) =>
    s.split("\n").map(x => x.trim()).filter(Boolean);

  const save = async () => {
    if (!activeClientId) { toast.error("No active workspace"); return; }
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    const payload: any = {
      client_id: activeClientId,
      contact_id: form.contact_id || null,
      title: form.title,
      meeting_date: form.meeting_date ? new Date(form.meeting_date).toISOString() : null,
      transcript: form.transcript || null,
      summary: form.summary || null,
      action_items: splitLines(form.action_items),
      next_steps: splitLines(form.next_steps),
      sentiment: form.sentiment,
      scanned_for_opportunities: false,
    };
    const { error } = await supabase.from("meeting_intelligence" as any).insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Meeting notes logged");
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Manual Meeting Notes</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-foreground/90 mb-2">
          <strong>Free alternative to paid AI notetakers.</strong> Paste a transcript from Zoom/Teams/Meet's
          built-in free transcription, or type notes manually — either way, this row is scanned for
          money-in-motion signals just like a webhook-ingested notetaker transcript.
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contact (optional)</Label>
              <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meeting Date</Label>
              <Input
                type="datetime-local"
                value={form.meeting_date}
                onChange={(e) => setForm({ ...form, meeting_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Discovery call with Jane Doe" />
          </div>
          <div>
            <Label>Summary</Label>
            <Textarea rows={3} value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          </div>
          <div>
            <Label>Transcript (optional — paste raw if available)</Label>
            <Textarea rows={5} value={form.transcript}
              onChange={(e) => setForm({ ...form, transcript: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Action Items (one per line)</Label>
              <Textarea rows={4} value={form.action_items}
                onChange={(e) => setForm({ ...form, action_items: e.target.value })} />
            </div>
            <div>
              <Label>Next Steps (one per line)</Label>
              <Textarea rows={4} value={form.next_steps}
                onChange={(e) => setForm({ ...form, next_steps: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Sentiment</Label>
            <Select value={form.sentiment} onValueChange={(v) => setForm({ ...form, sentiment: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SENTIMENTS.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Notes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
