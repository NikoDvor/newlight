import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { onMeetingQualified, createProposalDraft } from "@/lib/salesAutomation";
import {
  ArrowLeft, Calendar, User, Building2, Briefcase, Clock,
  CheckCircle2, XCircle, FileText, AlertCircle, MessageSquare
} from "lucide-react";

const STATUS_OPTIONS = ["scheduled", "confirmed", "completed", "cancelled", "rescheduled", "no_show"];
const OUTCOME_OPTIONS = ["pending", "qualified", "not_qualified", "proposal_needed", "closed_won", "closed_lost", "follow_up_needed"];
const TYPE_OPTIONS = ["intro_call", "discovery_call", "demo_call", "closing_call", "follow_up_call"];

const LABELS: Record<string, string> = {
  scheduled: "Scheduled", confirmed: "Confirmed", completed: "Completed",
  cancelled: "Cancelled", rescheduled: "Rescheduled", no_show: "No Show",
  pending: "Pending", qualified: "Qualified", not_qualified: "Not Qualified",
  proposal_needed: "Proposal Needed", closed_won: "Closed Won", closed_lost: "Closed Lost",
  follow_up_needed: "Follow-Up", intro_call: "Intro Call", discovery_call: "Discovery Call",
  demo_call: "Demo Call", closing_call: "Closing Call", follow_up_call: "Follow-Up Call",
};

export default function AdminMeetingDetail() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meetingId) return;
    supabase.from("sales_meetings")
      .select("*, crm_contacts(full_name, email), crm_companies(company_name), crm_deals(deal_name, deal_value)")
      .eq("id", meetingId).single()
      .then(({ data }) => {
        setMeeting(data);
        setNotes(data?.summary_notes || "");
        setActionItems(data?.action_items || "");
        setLoading(false);
      });
  }, [meetingId]);

  if (loading) return <div className="p-8 text-center text-white/40">Loading…</div>;
  if (!meeting) return <div className="p-8 text-center text-white/40">Meeting not found</div>;

  const updateField = async (field: string, value: any) => {
    await supabase.from("sales_meetings").update({ [field]: value } as any).eq("id", meeting.id);
    setMeeting({ ...meeting, [field]: value });
    toast.success("Updated");
  };

  const handleMarkQualified = async () => {
    if (meeting.deal_id) {
      await onMeetingQualified(meeting.id, meeting.deal_id, "qualified");
      setMeeting({ ...meeting, status: "completed", meeting_outcome: "qualified" });
      toast.success("Meeting completed & deal qualified");
    }
  };

  const handleCreateProposal = async () => {
    if (!meeting.deal_id) { toast.error("No deal linked"); return; }
    const proposal = await createProposalDraft({
      dealId: meeting.deal_id,
      contactId: meeting.contact_id,
      companyId: meeting.company_id,
      title: `Proposal — ${meeting.crm_companies?.company_name || meeting.title}`,
    });
    if (proposal) {
      toast.success("Proposal draft created");
      navigate(`/admin/proposals/${proposal.id}`);
    }
  };

  const saveNotes = async () => {
    await supabase.from("sales_meetings").update({ summary_notes: notes, action_items: actionItems } as any).eq("id", meeting.id);
    toast.success("Notes saved");
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
          <p className="text-sm text-white/40 mt-1">{LABELS[meeting.meeting_type] || meeting.meeting_type}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/10" onClick={() => updateField("status", "completed")}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Completed
          </Button>
          <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/10" onClick={() => updateField("status", "no_show")}>
            <XCircle className="h-3.5 w-3.5 mr-1" /> No Show
          </Button>
          <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={handleMarkQualified}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Qualified
          </Button>
          <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/10" onClick={handleCreateProposal}>
            <FileText className="h-3.5 w-3.5 mr-1" /> Create Proposal
          </Button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Status", value: LABELS[meeting.status] || meeting.status, icon: Clock },
          { label: "Outcome", value: LABELS[meeting.meeting_outcome] || meeting.meeting_outcome, icon: CheckCircle2 },
          { label: "Date", value: meeting.start_time ? new Date(meeting.start_time).toLocaleString() : "TBD", icon: Calendar },
          { label: "Location", value: meeting.location || "Not set", icon: Building2 },
        ].map(s => (
          <Card key={s.label} className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
                <span className="text-[10px] text-white/40 uppercase">{s.label}</span>
              </div>
              <p className="text-sm font-medium text-white">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Linked Records */}
        <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Linked Records</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {meeting.crm_contacts && (
              <div className="p-2.5 rounded-lg bg-white/[0.03] flex items-center gap-3">
                <User className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
                <div>
                  <p className="text-sm text-white">{meeting.crm_contacts.full_name}</p>
                  <p className="text-[10px] text-white/40">{meeting.crm_contacts.email}</p>
                </div>
              </div>
            )}
            {meeting.crm_companies && (
              <div className="p-2.5 rounded-lg bg-white/[0.03] flex items-center gap-3">
                <Building2 className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
                <p className="text-sm text-white">{meeting.crm_companies.company_name}</p>
              </div>
            )}
            {meeting.crm_deals && (
              <div className="p-2.5 rounded-lg bg-white/[0.03] flex items-center gap-3 cursor-pointer hover:bg-white/[0.06]"
                onClick={() => navigate(`/admin/deals/${meeting.deal_id}`)}>
                <Briefcase className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
                <div>
                  <p className="text-sm text-white">{meeting.crm_deals.deal_name}</p>
                  <p className="text-[10px] text-white/40">${Number(meeting.crm_deals.deal_value || 0).toLocaleString()}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Controls */}
        <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Update Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-[10px] text-white/40 uppercase mb-1">Status</p>
              <Select value={meeting.status} onValueChange={v => updateField("status", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(220,35%,12%)] border-white/10 text-white">
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase mb-1">Outcome</p>
              <Select value={meeting.meeting_outcome} onValueChange={v => updateField("meeting_outcome", v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(220,35%,12%)] border-white/10 text-white">
                  {OUTCOME_OPTIONS.map(s => <SelectItem key={s} value={s}>{LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border-0 bg-white/[0.04] lg:col-span-2" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Summary Notes & Action Items</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Meeting summary notes…" className="bg-white/5 border-white/10 text-white min-h-[80px]" />
            <Textarea value={actionItems} onChange={e => setActionItems(e.target.value)} placeholder="Action items…" className="bg-white/5 border-white/10 text-white min-h-[60px]" />
            <Button size="sm" className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))]" onClick={saveNotes}>Save Notes</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
