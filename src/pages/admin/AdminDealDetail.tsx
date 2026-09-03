import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { onDealClosedWon, onDealClosedLost, createProposalDraft } from "@/lib/salesAutomation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Building2, User, DollarSign, Calendar, FileText,
  CheckCircle2, XCircle, Target, Clock, MessageSquare, Plus
} from "lucide-react";

const STAGES = [
  "cold_lead", "warm_lead", "hot_lead", "won_lead",
];
const STAGE_LABELS: Record<string, string> = {
  cold_lead: "Cold Lead", warm_lead: "Warm Lead", hot_lead: "Hot Lead", won_lead: "Won Lead",
};
const QUAL_LABELS: Record<string, string> = {
  unqualified: "Unqualified", needs_review: "Needs Review", qualified: "Qualified",
  proposal_ready: "Proposal Ready", closed_won: "Closed Won", closed_lost: "Closed Lost",
};

export default function AdminDealDetail() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<any>(null);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [referral, setReferral] = useState<{ promoter_id: string; full_name: string } | null>(null);
  const [envelopeReview, setEnvelopeReview] = useState<{ attorney_reviewed: boolean; legal_review_note: string | null } | null>(null);
  const [notesSummary, setNotesSummary] = useState<string>("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [pricingModel, setPricingModel] = useState<"retainer" | "commission">("retainer");
  const [initialFee, setInitialFee] = useState("");
  const [recurringFee, setRecurringFee] = useState("");
  const [commissionRate, setCommissionRate] = useState("25");
  const [commissionRateOngoing, setCommissionRateOngoing] = useState("10");
  const [kpiTarget, setKpiTarget] = useState("");
  const [termsSaving, setTermsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealId) return;
    Promise.all([
      supabase.from("crm_deals").select("*, crm_contacts(id, full_name, email, phone), crm_companies(id, company_name, website, industry)").eq("id", dealId).single(),
      supabase.from("sales_meetings").select("*").eq("deal_id", dealId).order("start_time", { ascending: false }),
      supabase.from("proposals").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
      supabase.from("crm_tasks").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
      supabase.from("audit_logs").select("*").eq("module", "sales").order("created_at", { ascending: false }).limit(20),
    ]).then(async ([dRes, mRes, pRes, tRes, aRes]) => {
      setDeal(dRes.data);
      setNotesSummary(dRes.data?.notes_summary || "");
      const d: any = dRes.data;
      if (d) {
        setPricingModel(d.pricing_model === "commission" ? "commission" : "retainer");
        setInitialFee(d.initial_fee != null ? String(d.initial_fee) : "");
        setRecurringFee(d.recurring_fee != null ? String(d.recurring_fee) : "");
        setCommissionRate(d.commission_rate != null ? String(d.commission_rate) : "25");
        setCommissionRateOngoing(d.commission_rate_ongoing != null ? String(d.commission_rate_ongoing) : "10");
        setKpiTarget(d.retainer_kpi || "");
      }
      setMeetings(mRes.data || []);
      setProposals(pRes.data || []);
      setTasks(tRes.data || []);
      setActivities(aRes.data || []);
      // Referral attribution surface
      const { data: attr } = await supabase
        .from("referral_attributions")
        .select("promoter_id, promoters(full_name)")
        .eq("crm_deal_id", dealId)
        .maybeSingle();
      if (attr?.promoter_id) {
        setReferral({ promoter_id: attr.promoter_id, full_name: (attr as any).promoters?.full_name || "Promoter" });
      }
      // Internal legal-review flag on the deal's service agreement envelope (admin-only visibility)
      const { data: env } = await supabase
        .from("document_envelopes")
        .select("attorney_reviewed, legal_review_note")
        .eq("related_type", "crm_deal")
        .eq("related_id", dealId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (env) setEnvelopeReview(env as any);
      setLoading(false);
    });
  }, [dealId]);

  if (loading) return <div className="p-8 text-center text-white/40">Loading…</div>;
  if (!deal) return <div className="p-8 text-center text-white/40">Deal not found</div>;

  const moveStage = async (stage: string) => {
    await supabase.from("crm_deals").update({ pipeline_stage: stage } as any).eq("id", deal.id);
    setDeal({ ...deal, pipeline_stage: stage });
    toast.success(`Stage → ${STAGE_LABELS[stage]}`);
  };

  const handleClosedWon = async () => {
    await onDealClosedWon(deal.id, deal);
    setDeal({ ...deal, pipeline_stage: "closed_won", status: "won" });
    toast.success("Deal marked as Won — setup tasks created");
  };

  const handleClosedLost = async () => {
    await onDealClosedLost(deal.id, deal);
    setDeal({ ...deal, pipeline_stage: "closed_lost", status: "lost" });
    toast.success("Deal marked as Lost");
  };

  const handleCreateProposal = async () => {
    const proposal = await createProposalDraft({
      dealId: deal.id,
      contactId: deal.contact_id,
      companyId: deal.company_id,
      title: `Proposal — ${deal.crm_companies?.company_name || deal.deal_name}`,
    });
    if (proposal) {
      toast.success("Proposal draft created");
      navigate(`/admin/proposals/${proposal.id}`);
    }
  };

  const isCommission = pricingModel === "commission";
  const saveTerms = async () => {
    if (!deal?.id) return;
    setTermsSaving(true);
    try {
      const payload = {
        deal_id: deal.id,
        pricing_model: pricingModel,
        initial_fee: initialFee === "" ? null : Number(initialFee),
        recurring_fee: isCommission || recurringFee === "" ? null : Number(recurringFee),
        commission_rate: isCommission ? Number(commissionRate || 0) : null,
        commission_rate_ongoing: isCommission ? Number(commissionRateOngoing || 0) : null,
        retainer_kpi: kpiTarget || null,
      };
      const { data, error } = await supabase.functions.invoke("update-deal-terms", { body: payload });
      if (error) {
        let msg = error.message;
        try { const j = await (error as any).context?.json?.(); if (j?.error) msg = j.error; } catch { /* ignore */ }
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      setDeal({ ...deal, ...payload, id: deal.id });
      toast.success("Deal terms updated — agreement regenerated");
    } catch (e: any) {
      toast.error(e?.message || "Could not update deal terms");
    } finally {
      setTermsSaving(false);
    }
  };


  const saveNotes = async () => {
    if (!deal?.id) return;
    setNotesSaving(true);
    await supabase.from("crm_deals").update({ notes_summary: notesSummary } as any).eq("id", deal.id);
    setDeal({ ...deal, notes_summary: notesSummary });
    toast.success("Notes saved");
    setNotesSaving(false);
  };

  const contact = deal.crm_contacts;
  const company = deal.crm_companies;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/admin/sales-pipeline")} className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Pipeline
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{deal.deal_name}</h1>
          <p className="text-sm text-white/40 mt-1">
            {company?.company_name || "No company"} · {contact?.full_name || "No contact"}
          </p>
          {referral && (
            <button
              onClick={() => navigate(`/admin/promoters?promoterId=${referral.promoter_id}`)}
              className="mt-2 inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
              title="View referring promoter"
            >
              <User className="h-3 w-3" />
              Referred by {referral.full_name}
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/10" onClick={handleCreateProposal}>
            <FileText className="h-3.5 w-3.5 mr-1" /> Create Proposal
          </Button>
          {deal.client_id && (
            <Button size="sm" variant="outline" className="border-[hsla(211,96%,60%,.3)] text-[hsl(var(--nl-neon))] hover:bg-[hsla(211,96%,60%,.1)]"
              onClick={() => navigate(`/admin/clients/${deal.client_id}/proposal-wizard?dealId=${deal.id}`)}>
              <Target className="h-3.5 w-3.5 mr-1" /> Proposal Wizard
            </Button>
          )}
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleClosedWon}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Won
          </Button>
          <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={handleClosedLost}>
            <XCircle className="h-3.5 w-3.5 mr-1" /> Mark Lost
          </Button>
        </div>
      </div>

      {/* Key Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Value", value: `$${Number(deal.deal_value || 0).toLocaleString()}`, icon: DollarSign },
          { label: "Stage", value: STAGE_LABELS[deal.pipeline_stage] || deal.pipeline_stage, icon: Target },
          { label: "Qualification", value: QUAL_LABELS[deal.qualification_status] || deal.qualification_status || "—", icon: CheckCircle2 },
          { label: "Probability", value: `${deal.close_probability || 0}%`, icon: Clock },
        ].map((s, i) => (
          <Card key={s.label} className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
                <span className="text-[10px] text-white/40 uppercase">{s.label}</span>
              </div>
              <p className="text-sm font-semibold text-white">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stage Selector */}
      <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardContent className="p-4">
          <p className="text-[10px] text-white/40 uppercase mb-2">Move Stage</p>
          <Select value={deal.pipeline_stage} onValueChange={moveStage}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[hsl(220,35%,12%)] border-white/10 text-white">
              {STAGES.map(s => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Deal Terms */}
        <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Deal Terms</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {deal.pay_sign_status === "paid_signed" ? (
              <>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-200">
                  Signed — terms are locked. Editing here would not update the client's signed copy or any live billing.
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-white/40 text-xs uppercase">Pricing Model</span><span className="text-white">{deal.pricing_model === "commission" ? "Commission" : "Retainer"}</span></div>
                  <div className="flex justify-between"><span className="text-white/40 text-xs uppercase">Initial Fee</span><span className="text-white">${Number(deal.initial_fee || 0).toLocaleString()}</span></div>
                  {deal.pricing_model === "commission" ? (
                    <>
                      <div className="flex justify-between"><span className="text-white/40 text-xs uppercase">Commission — Year 1</span><span className="text-white">{Number(deal.commission_rate || 0)}%</span></div>
                      <div className="flex justify-between"><span className="text-white/40 text-xs uppercase">Commission — After Yr 1</span><span className="text-white">{Number(deal.commission_rate_ongoing || 0)}%</span></div>
                    </>
                  ) : (
                    <div className="flex justify-between"><span className="text-white/40 text-xs uppercase">Recurring Fee</span><span className="text-white">${Number(deal.recurring_fee || 0).toLocaleString()}/mo</span></div>
                  )}
                  <div>
                    <p className="text-white/40 text-xs uppercase mb-1">KPI Target</p>
                    <p className="text-white/80 text-xs whitespace-pre-wrap">{deal.retainer_kpi || "—"}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-xs text-white/60">Pricing Model</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {(["retainer", "commission"] as const).map(m => (
                      <Button
                        key={m}
                        type="button"
                        variant="outline"
                        onClick={() => setPricingModel(m)}
                        className={pricingModel === m
                          ? "border-[hsl(211,96%,56%)] bg-[hsl(211,96%,56%)]/15 text-white"
                          : "border-white/10 bg-white/5 text-white/60"}
                      >
                        {m === "retainer" ? "Retainer" : "Commission"}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-white/60">Initial Fee (USD)</Label>
                  <Input
                    type="number" min="0" step="0.01"
                    value={initialFee}
                    onChange={e => setInitialFee(e.target.value)}
                    placeholder="e.g. 5000"
                    className="bg-white/5 border-white/10 text-white mt-1"
                  />
                </div>

                {!isCommission ? (
                  <div>
                    <Label className="text-xs text-white/60">Recurring Fee (USD / month)</Label>
                    <Input
                      type="number" min="0" step="0.01"
                      value={recurringFee}
                      onChange={e => setRecurringFee(e.target.value)}
                      placeholder="e.g. 1500"
                      className="bg-white/5 border-white/10 text-white mt-1"
                    />
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-white/60">Commission Rate — Year 1 (%)</Label>
                      <Input
                        type="number" min="0" max="100" step="0.1"
                        value={commissionRate}
                        onChange={e => setCommissionRate(e.target.value)}
                        placeholder="e.g. 25"
                        className="bg-white/5 border-white/10 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-white/60">Commission Rate — After Year 1 (%)</Label>
                      <Input
                        type="number" min="0" max="100" step="0.1"
                        value={commissionRateOngoing}
                        onChange={e => setCommissionRateOngoing(e.target.value)}
                        placeholder="e.g. 10"
                        className="bg-white/5 border-white/10 text-white mt-1"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-white/60">KPI Target</Label>
                  <Textarea
                    value={kpiTarget}
                    onChange={e => setKpiTarget(e.target.value)}
                    rows={3}
                    placeholder="e.g. 12 qualified appointments per month"
                    className="bg-white/5 border-white/10 text-white mt-1"
                  />
                </div>

                <Button size="sm" onClick={saveTerms} disabled={termsSaving} className="w-full">
                  {termsSaving ? "Saving…" : "Save Changes"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Contact & Company */}
        <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Contact & Company</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {contact && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03]">
                <User className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
                <div>
                  <p className="text-sm text-white">{contact.full_name}</p>
                  <p className="text-[10px] text-white/40">{contact.email} · {contact.phone || "No phone"}</p>
                </div>
              </div>
            )}
            {company && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03]">
                <Building2 className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
                <div>
                  <p className="text-sm text-white">{company.company_name}</p>
                  <p className="text-[10px] text-white/40">{company.industry || "—"} · {company.website || "—"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meetings */}
        <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-white/80">Meetings</CardTitle>
              <Button size="sm" variant="ghost" className="text-[hsl(var(--nl-neon))] text-xs h-7" onClick={() => navigate(`/admin/meetings/new?dealId=${deal.id}`)}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {meetings.length === 0 ? (
              <p className="text-xs text-white/30 py-4 text-center">No meetings yet</p>
            ) : meetings.map(m => (
              <div key={m.id} onClick={() => navigate(`/admin/meetings/${m.id}`)}
                className="p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white font-medium">{m.title}</p>
                  <Badge className="text-[9px] bg-white/10 text-white/60">{m.status}</Badge>
                </div>
                <p className="text-[10px] text-white/30 mt-0.5">{m.start_time ? new Date(m.start_time).toLocaleDateString() : "No date"} · {m.meeting_type}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Proposals */}
        <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Proposals</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {proposals.length === 0 ? (
              <p className="text-xs text-white/30 py-4 text-center">No proposals yet</p>
            ) : proposals.map(p => (
              <div key={p.id} onClick={() => navigate(`/admin/proposals/${p.id}`)}
                className="p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white font-medium">{p.proposal_title}</p>
                  <Badge className="text-[9px] bg-white/10 text-white/60">{p.proposal_status}</Badge>
                </div>
                <p className="text-[10px] text-white/30 mt-0.5">${Number(p.monthly_fee || 0).toLocaleString()}/mo · {p.contract_term}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Tasks</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {tasks.length === 0 ? (
              <p className="text-xs text-white/30 py-4 text-center">No tasks yet</p>
            ) : tasks.map(t => (
              <div key={t.id} className="p-2.5 rounded-lg bg-white/[0.03] flex items-center justify-between">
                <div>
                  <p className="text-xs text-white font-medium">{t.title}</p>
                  <p className="text-[10px] text-white/30">{t.task_category || "general"} · {t.priority}</p>
                </div>
                <Badge className={`text-[9px] ${t.status === "open" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>{t.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Salesman Notes */}
        <Card className="border-0 bg-white/[0.04] lg:col-span-2" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-white/80 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[hsl(var(--nl-sky))]" /> Salesman Notes
              </CardTitle>
              <Button size="sm" variant="ghost" className="text-[hsl(var(--nl-neon))] text-xs h-7" onClick={saveNotes} disabled={notesSaving}>
                {notesSaving ? "Saving..." : "Save Notes"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notesSummary}
              onChange={e => setNotesSummary(e.target.value)}
              placeholder="Add notes about this deal — objections, timeline, decision makers, next steps..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 text-sm min-h-[120px] resize-none focus:border-primary/30"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
