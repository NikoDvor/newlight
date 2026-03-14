import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, User, Mail, Phone, Globe, MapPin, Calendar, FileText,
  Building2, DollarSign, Loader2, ExternalLink, Hammer, Eye, CheckCircle2,
  Clock, Target, Zap, Save
} from "lucide-react";

interface Prospect {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string;
  website: string | null;
  primary_location: string | null;
  business_type: string | null;
  reason_for_inquiry: string | null;
  is_decision_maker: string | null;
  budget_range: string | null;
  proposal_recipient_email: string | null;
  timeline: string | null;
  notes: string | null;
  source: string | null;
  stage: string;
  status: string;
  meeting_date: string | null;
  assigned_to: string | null;
  created_at: string;
}

interface DemoBuild {
  id: string;
  status: string;
  workspace_slug: string;
  primary_goal: string | null;
  main_service: string | null;
  created_at: string;
}

const stageLabels: Record<string, string> = {
  new_submission: "New Submission",
  booking_submitted: "Booking Submitted",
  audit_complete: "Audit Complete",
  proposal_drafted: "Proposal Drafted",
  ready_for_provisioning: "Ready for Provisioning",
  provisioned: "Provisioned",
};

const statusColors: Record<string, string> = {
  build_in_progress: "text-yellow-400 bg-yellow-400/10",
  demo_ready: "text-[hsl(var(--nl-sky))] bg-[hsla(211,96%,60%,.12)]",
  awaiting_closing: "text-[hsl(var(--nl-neon))] bg-[hsla(211,96%,60%,.12)]",
  closed: "text-emerald-400 bg-emerald-400/10",
};

export default function AdminProspectDetail() {
  const { prospectId } = useParams<{ prospectId: string }>();
  const navigate = useNavigate();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [demoBuild, setDemoBuild] = useState<DemoBuild | null>(null);
  const [loading, setLoading] = useState(true);
  const [internalNotes, setInternalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (!prospectId) return;
    Promise.all([
      supabase.from("prospects").select("*").eq("id", prospectId).single(),
      supabase.from("demo_builds").select("*").eq("prospect_id", prospectId).maybeSingle(),
    ]).then(([{ data: p }, { data: d }]) => {
      setProspect(p);
      setDemoBuild(d as any);
      setInternalNotes(p?.notes || "");
      setLoading(false);
    });
  }, [prospectId]);

  const saveNotes = async () => {
    if (!prospectId) return;
    setSavingNotes(true);
    await supabase.from("prospects").update({ notes: internalNotes }).eq("id", prospectId);
    toast.success("Notes saved");
    setSavingNotes(false);
  };

  const inputCls = "bg-white/[0.06] border-white/10 text-white placeholder:text-white/30";

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/30" /></div>;
  if (!prospect) return <div className="text-white/50 text-center py-20">Prospect not found</div>;

  const infoItems = [
    { label: "Email", value: prospect.email, icon: Mail },
    { label: "Phone", value: prospect.phone, icon: Phone },
    { label: "Website", value: prospect.website, icon: Globe },
    { label: "Location", value: prospect.primary_location, icon: MapPin },
    { label: "Industry", value: prospect.business_type, icon: Building2 },
    { label: "Decision Maker", value: prospect.is_decision_maker, icon: User },
    { label: "Timeline", value: prospect.timeline, icon: Clock },
    { label: "Budget (Internal)", value: prospect.budget_range, icon: DollarSign },
    { label: "Source", value: prospect.source, icon: Zap },
    { label: "Proposal Recipient", value: prospect.proposal_recipient_email, icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate("/admin/prospects")} className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 mb-2 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Back to Prospects
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{prospect.business_name}</h1>
            <p className="text-sm text-white/50 mt-1">{prospect.full_name} · <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsla(211,96%,60%,.15)] text-[hsl(var(--nl-neon))]">{stageLabels[prospect.stage] || prospect.stage}</span></p>
          </div>
          {demoBuild?.status === "awaiting_closing" && (
            <Button onClick={() => navigate(`/admin/demo-builds/${demoBuild.id}/close`)} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
              <Zap className="h-4 w-4 mr-1" /> Close & Activate
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info column */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-white/60 mb-4 flex items-center gap-2"><User className="h-3.5 w-3.5" /> Intake Summary</p>
              <div className="grid grid-cols-2 gap-4">
                {infoItems.map(item => (
                  <div key={item.label}>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm text-white/80 mt-0.5">{item.value || "—"}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Reason for inquiry */}
          {prospect.reason_for_inquiry && (
            <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-white/60 mb-2 flex items-center gap-2"><Target className="h-3.5 w-3.5" /> Growth Challenge / Reason for Inquiry</p>
                <p className="text-sm text-white/70 leading-relaxed">{prospect.reason_for_inquiry}</p>
              </CardContent>
            </Card>
          )}

          {/* Internal notes */}
          <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-white/60 mb-2 flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> Internal Notes</p>
              <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Add internal sales notes..." className={`${inputCls} min-h-[80px] mb-2`} />
              <Button size="sm" onClick={saveNotes} disabled={savingNotes} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white h-8 text-xs">
                {savingNotes ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />} Save Notes
              </Button>
            </CardContent>
          </Card>

          {/* Salesman talking points */}
          <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-white/60 mb-3 flex items-center gap-2"><Zap className="h-3.5 w-3.5" /> Recommended Talking Points</p>
              <div className="space-y-2">
                {[
                  prospect.reason_for_inquiry ? `Address their primary challenge: "${prospect.reason_for_inquiry.slice(0, 80)}..."` : null,
                  prospect.business_type ? `Tailor pitch to ${prospect.business_type} industry specifics` : null,
                  prospect.primary_location ? `Reference local market dynamics in ${prospect.primary_location}` : null,
                  demoBuild?.primary_goal ? `Focus on their goal: ${demoBuild.primary_goal}` : null,
                  demoBuild?.main_service ? `Connect how NewLight amplifies their service: ${demoBuild.main_service}` : null,
                  "Show tailored demo workspace with their branding",
                  "Walk through the online audit findings",
                  "Present enterprise growth system as the solution",
                ].filter(Boolean).map((point, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                    <CheckCircle2 className="h-3 w-3 mt-0.5 text-[hsl(var(--nl-sky))] shrink-0" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Demo Build Status */}
          <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-white/60 mb-3 flex items-center gap-2"><Hammer className="h-3.5 w-3.5" /> Demo Build</p>
              {demoBuild ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[demoBuild.status] || "text-white/40 bg-white/5"}`}>
                      {demoBuild.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-[11px] text-white/40 space-y-1">
                    <p>Slug: <span className="text-white/60 font-mono">{demoBuild.workspace_slug}</span></p>
                    {demoBuild.primary_goal && <p>Goal: <span className="text-white/60">{demoBuild.primary_goal}</span></p>}
                    {demoBuild.main_service && <p>Service: <span className="text-white/60">{demoBuild.main_service}</span></p>}
                    <p>Created: {new Date(demoBuild.created_at).toLocaleDateString()}</p>
                  </div>
                  <Button size="sm" variant="outline" className="w-full border-white/10 text-white hover:bg-white/10 text-xs h-8"
                    onClick={() => navigate("/admin/demo-builds")}>
                    <ExternalLink className="h-3 w-3 mr-1" /> Open Demo Build
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-white/30">No demo build linked</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-semibold text-white/60 mb-2">Quick Actions</p>
              {[
                { label: "View Audit Pack", path: "/audit-pack", icon: Eye },
                { label: "Open Demo Builds", path: "/admin/demo-builds", icon: Hammer },
                { label: "View All Prospects", path: "/admin/prospects", icon: User },
              ].map(a => (
                <Button key={a.label} size="sm" variant="ghost" className="w-full justify-start text-white/60 hover:text-white hover:bg-white/[0.06] text-xs h-8"
                  onClick={() => navigate(a.path)}>
                  <a.icon className="h-3 w-3 mr-2" /> {a.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-white/60 mb-3">Timeline</p>
              <div className="space-y-3">
                <TimelineItem text="Form submitted" date={prospect.created_at} />
                {demoBuild && <TimelineItem text="Demo build started" date={demoBuild.created_at} />}
                {prospect.meeting_date && <TimelineItem text={`Meeting: ${new Date(prospect.meeting_date).toLocaleDateString()}`} date={prospect.meeting_date} />}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ text, date }: { text: string; date: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--nl-sky))] mt-1.5 shrink-0" />
      <div>
        <p className="text-[11px] text-white/70">{text}</p>
        <p className="text-[10px] text-white/30">{new Date(date).toLocaleDateString()}</p>
      </div>
    </div>
  );
}
