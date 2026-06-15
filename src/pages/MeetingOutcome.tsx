import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const MEETING_TYPES = [
  { value: "intro_call", label: "Intro Call" },
  { value: "discovery_call", label: "Discovery Call" },
  { value: "demo_call", label: "Demo Call" },
  { value: "closing_call", label: "Closing Call" },
  { value: "follow_up_call", label: "Follow-Up Call" },
];

const OUTCOMES = [
  { value: "pending", label: "Pending" },
  { value: "qualified", label: "Qualified" },
  { value: "not_qualified", label: "Not Qualified" },
  { value: "proposal_needed", label: "Proposal Needed" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
  { value: "follow_up_needed", label: "Follow-Up Needed" },
];

const PACKAGES = ["Starter", "Growth", "Scale", "Enterprise", "Custom"];
const CHANNELS = ["SEO", "PPC", "Social Media", "Website", "Reviews", "Email Marketing", "Content"];

export default function MeetingOutcome() {
  const { activeClientId, user } = useWorkspace();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [contacts, setContacts] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    meeting_type: "discovery_call",
    meeting_outcome: "pending",
    contact_id: "",
    deal_id: "",
    start_time: "",
    recommended_package: "",
    main_offer: "",
    primary_problem: "",
    best_route: "",
    priority_channels: [] as string[],
    summary_notes: "",
    action_items: "",
    objections: "",
    follow_up_date: "",
    timeline_notes: "",
    proposal_ready: false,
  });

  useEffect(() => {
    if (!activeClientId) return;
    Promise.all([
      supabase.from("crm_contacts").select("id, full_name").eq("client_id", activeClientId).order("full_name").limit(200),
      supabase.from("crm_deals").select("id, deal_name").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(100),
    ]).then(([cRes, dRes]) => {
      setContacts(cRes.data || []);
      setDeals(dRes.data || []);
    });
  }, [activeClientId]);

  const toggleChannel = (ch: string) => {
    setForm(p => ({
      ...p,
      priority_channels: p.priority_channels.includes(ch)
        ? p.priority_channels.filter(c => c !== ch)
        : [...p.priority_channels, ch],
    }));
  };

  const handleSubmit = async (isDraft = false) => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const notes = [
      form.summary_notes,
      form.primary_problem ? `\n\nPrimary Problem: ${form.primary_problem}` : "",
      form.best_route ? `\nBest Route: ${form.best_route}` : "",
      form.recommended_package ? `\nRecommended Package: ${form.recommended_package}` : "",
      form.main_offer ? `\nMain Offer: ${form.main_offer}` : "",
      form.priority_channels.length ? `\nPriority Channels: ${form.priority_channels.join(", ")}` : "",
      form.timeline_notes ? `\nTimeline: ${form.timeline_notes}` : "",
    ].join("").trim();

    const actionItems = [
      form.action_items,
      form.objections ? `\n\nObjections: ${form.objections}` : "",
      form.follow_up_date ? `\nFollow-up: ${form.follow_up_date}` : "",
      form.proposal_ready ? "\nProposal ready to send." : "",
    ].join("").trim();

    const { data, error } = await supabase.from("sales_meetings").insert({
      client_id: activeClientId || null,
      title: form.title.trim(),
      meeting_type: form.meeting_type,
      meeting_outcome: isDraft ? "pending" : form.meeting_outcome,
      contact_id: form.contact_id || null,
      deal_id: form.deal_id || null,
      start_time: form.start_time ? new Date(form.start_time).toISOString() : null,
      status: isDraft ? "scheduled" : "completed",
      summary_notes: notes || null,
      action_items: actionItems || null,
      assigned_salesman_user_id: user?.id || null,
      source_type: "internal",
    } as any).select().single();

    if (error) {
      toast({ title: "Error saving meeting", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    toast({ title: isDraft ? "Draft saved" : "Meeting outcome submitted" });
    setSubmitting(false);
    if (!isDraft && data) {
      navigate(`/admin/meetings/${data.id}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Meeting Outcome" description="Record the results from the sales meeting" />

      <motion.div
        className="card-widget p-8 rounded-2xl"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Meeting Title *</Label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Discovery Call — ABC Corp" />
          </div>
          <div className="space-y-2">
            <Label>Meeting Type</Label>
            <Select value={form.meeting_type} onValueChange={v => setForm(p => ({ ...p, meeting_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEETING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Outcome</Label>
            <Select value={form.meeting_outcome} onValueChange={v => setForm(p => ({ ...p, meeting_outcome: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OUTCOMES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Meeting Date &amp; Time</Label>
            <Input type="datetime-local" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Recommended Package</Label>
            <Select value={form.recommended_package} onValueChange={v => setForm(p => ({ ...p, recommended_package: v }))}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {PACKAGES.map(pkg => <SelectItem key={pkg} value={pkg.toLowerCase()}>{pkg}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Main Offer</Label>
            <Input value={form.main_offer} onChange={e => setForm(p => ({ ...p, main_offer: e.target.value }))} placeholder="e.g. Website + SEO Bundle" />
          </div>

          {contacts.length > 0 && (
            <div className="space-y-2">
              <Label>Link Contact</Label>
              <Select value={form.contact_id} onValueChange={v => setForm(p => ({ ...p, contact_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select contact…" /></SelectTrigger>
                <SelectContent>
                  {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {deals.length > 0 && (
            <div className="space-y-2">
              <Label>Link Deal</Label>
              <Select value={form.deal_id} onValueChange={v => setForm(p => ({ ...p, deal_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select deal…" /></SelectTrigger>
                <SelectContent>
                  {deals.map(d => <SelectItem key={d.id} value={d.id}>{d.deal_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="sm:col-span-2 space-y-2">
            <Label>Primary Problem</Label>
            <Textarea value={form.primary_problem} onChange={e => setForm(p => ({ ...p, primary_problem: e.target.value }))} placeholder="What is the main problem the prospect is facing?" className="min-h-[80px]" />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Best Route of Action</Label>
            <Textarea value={form.best_route} onChange={e => setForm(p => ({ ...p, best_route: e.target.value }))} placeholder="Recommended strategy and approach…" className="min-h-[80px]" />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Priority Channels</Label>
            <div className="flex flex-wrap gap-3">
              {CHANNELS.map(ch => (
                <label key={ch} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.priority_channels.includes(ch)}
                    onCheckedChange={() => toggleChannel(ch)}
                  />
                  {ch}
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Summary Notes</Label>
            <Textarea value={form.summary_notes} onChange={e => setForm(p => ({ ...p, summary_notes: e.target.value }))} placeholder="Meeting summary…" className="min-h-[100px]" />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Action Items</Label>
            <Textarea value={form.action_items} onChange={e => setForm(p => ({ ...p, action_items: e.target.value }))} placeholder="What needs to happen next…" className="min-h-[60px]" />
          </div>
          <div className="space-y-2">
            <Label>Follow-up Date</Label>
            <Input type="date" value={form.follow_up_date} onChange={e => setForm(p => ({ ...p, follow_up_date: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Timeline Notes</Label>
            <Input value={form.timeline_notes} onChange={e => setForm(p => ({ ...p, timeline_notes: e.target.value }))} placeholder="e.g. wants to start before Q2" />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Objections</Label>
            <Textarea value={form.objections} onChange={e => setForm(p => ({ ...p, objections: e.target.value }))} placeholder="Any concerns or objections raised…" className="min-h-[60px]" />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <Checkbox
              id="proposal-ready"
              checked={form.proposal_ready}
              onCheckedChange={v => setForm(p => ({ ...p, proposal_ready: !!v }))}
            />
            <Label htmlFor="proposal-ready" className="cursor-pointer">Proposal Ready to Send</Label>
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" onClick={() => handleSubmit(true)} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Draft"}
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Outcome"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
