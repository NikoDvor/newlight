import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { onProposalSent } from "@/lib/salesAutomation";
import {
  ArrowLeft, FileText, DollarSign, Send, Copy, Archive,
  CheckCircle2, Eye, Clock, User, Building2, Briefcase, Plus,
  Link2, PenTool, Trash2, ExternalLink
} from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-amber-500/20 text-amber-400",
  internal_review: "bg-blue-500/20 text-blue-400",
  ready_to_send: "bg-cyan-500/20 text-cyan-400",
  sent: "bg-[hsla(211,96%,60%,.2)] text-[hsl(var(--nl-neon))]",
  viewed: "bg-purple-500/20 text-purple-400",
  accepted: "bg-emerald-500/20 text-emerald-400",
  declined: "bg-red-500/20 text-red-400",
  expired: "bg-white/10 text-white/40",
  archived: "bg-white/5 text-white/30",
};

export default function AdminProposalDetail() {
  const { proposalId } = useParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [signatures, setSignatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ item_name: "", item_description: "", quantity: 1, unit_price: 0 });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (!proposalId) return;
    Promise.all([
      supabase.from("proposals").select("*, crm_contacts(full_name, email), crm_companies(company_name), crm_deals(deal_name, deal_value)").eq("id", proposalId).single(),
      supabase.from("proposal_sections").select("*").eq("proposal_id", proposalId).order("section_order"),
      supabase.from("proposal_recipients").select("*").eq("proposal_id", proposalId),
      supabase.from("email_delivery_records").select("*").eq("proposal_id", proposalId).order("created_at", { ascending: false }),
      supabase.from("proposal_line_items").select("*").eq("proposal_id", proposalId).order("sort_order"),
      supabase.from("proposal_signatures").select("*").eq("proposal_id", proposalId).order("signed_at", { ascending: false }),
    ]).then(([pRes, sRes, rRes, dRes, liRes, sigRes]) => {
      setProposal(pRes.data);
      setForm(pRes.data || {});
      setSections(sRes.data || []);
      setRecipients(rRes.data || []);
      setDeliveries(dRes.data || []);
      setLineItems(liRes.data || []);
      setSignatures(sigRes.data || []);
      setLoading(false);
    });
  }, [proposalId]);

  if (loading) return <div className="p-8 text-center text-white/40">Loading…</div>;
  if (!proposal) return <div className="p-8 text-center text-white/40">Proposal not found</div>;

  const save = async () => {
    const { error } = await supabase.from("proposals").update({
      proposal_title: form.proposal_title,
      proposal_type: form.proposal_type,
      setup_fee: form.setup_fee,
      monthly_fee: form.monthly_fee,
      contract_term: form.contract_term,
      offer_summary: form.offer_summary,
      internal_summary: form.internal_summary,
    } as any).eq("id", proposal.id);
    if (error) { toast.error("Failed to save"); return; }
    setProposal({ ...proposal, ...form });
    setEditing(false);
    toast.success("Saved");
  };

  const updateStatus = async (status: string) => {
    await supabase.from("proposals").update({ proposal_status: status } as any).eq("id", proposal.id);
    setProposal({ ...proposal, proposal_status: status });
    toast.success(`Status → ${status.replace(/_/g, " ")}`);
  };

  const handleSend = async () => {
    const email = proposal.crm_contacts?.email;
    if (!email) { toast.error("No contact email to send to"); return; }
    await onProposalSent(proposal.id, proposal.deal_id, email);
    setProposal({ ...proposal, proposal_status: "sent", sent_at: new Date().toISOString() });
    toast.success("Proposal sent");
  };

  const addSection = async () => {
    const order = sections.length;
    const { data } = await supabase.from("proposal_sections").insert({
      proposal_id: proposal.id,
      section_key: `section_${order + 1}`,
      section_title: `Section ${order + 1}`,
      section_order: order,
      content: "",
    } as any).select().single();
    if (data) setSections([...sections, data]);
  };

  const updateSection = async (id: string, field: string, value: string) => {
    await supabase.from("proposal_sections").update({ [field]: value } as any).eq("id", id);
    setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const contact = proposal.crm_contacts;
  const company = proposal.crm_companies;
  const deal = proposal.crm_deals;

  const addLineItem = async () => {
    if (!newItem.item_name) { toast.error("Item name required"); return; }
    const total = newItem.quantity * newItem.unit_price;
    const { data } = await supabase.from("proposal_line_items").insert({
      proposal_id: proposal.id,
      item_name: newItem.item_name,
      item_description: newItem.item_description || null,
      quantity: newItem.quantity,
      unit_price: newItem.unit_price,
      total_price: total,
      sort_order: lineItems.length,
    }).select().single();
    if (data) setLineItems([...lineItems, data]);
    setNewItem({ item_name: "", item_description: "", quantity: 1, unit_price: 0 });
    toast.success("Line item added");
  };

  const removeLineItem = async (id: string) => {
    await supabase.from("proposal_line_items").delete().eq("id", id);
    setLineItems(lineItems.filter(i => i.id !== id));
  };

  const shareUrl = proposal.share_token ? `${window.location.origin}/proposal/${proposal.share_token}` : null;
  const copyShareLink = () => {
    if (shareUrl) { navigator.clipboard.writeText(shareUrl); toast.success("Link copied"); }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">{proposal.proposal_title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`text-[10px] ${STATUS_STYLE[proposal.proposal_status] || ""}`}>
              {proposal.proposal_status?.replace(/_/g, " ")}
            </Badge>
            <span className="text-xs text-white/30">v{proposal.version_number}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/10" onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
          {editing && <Button size="sm" className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))]" onClick={save}>Save Draft</Button>}
          <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/10" onClick={() => updateStatus("ready_to_send")}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Ready To Send
          </Button>
          <Button size="sm" className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))]" onClick={handleSend}>
            <Send className="h-3.5 w-3.5 mr-1" /> Send Proposal
          </Button>
          <Button size="sm" variant="outline" className="border-white/10 text-white/50 hover:bg-white/10" onClick={() => updateStatus("archived")}>
            <Archive className="h-3.5 w-3.5 mr-1" /> Archive
          </Button>
          {shareUrl && (
            <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/10" onClick={copyShareLink}>
              <Link2 className="h-3.5 w-3.5 mr-1" /> Copy Link
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Setup Fee", value: `$${Number(proposal.setup_fee || 0).toLocaleString()}` },
          { label: "Monthly", value: `$${Number(proposal.monthly_fee || 0).toLocaleString()}/mo` },
          { label: "Term", value: proposal.contract_term || "—" },
          { label: "Type", value: proposal.proposal_type?.replace(/_/g, " ") || "—" },
        ].map(s => (
          <Card key={s.label} className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-3">
              <p className="text-[10px] text-white/40 uppercase">{s.label}</p>
              <p className="text-sm font-semibold text-white mt-0.5">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="bg-white/[0.04] border border-white/[0.06]">
          {["details", "line_items", "sections", "signatures", "recipients", "delivery"].map(t => (
            <TabsTrigger key={t} value={t} className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10 capitalize text-xs">{t.replace(/_/g, " ")}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="details">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Proposal Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {editing ? (
                  <>
                    <div className="space-y-1"><Label className="text-white/60 text-xs">Title</Label><Input value={form.proposal_title || ""} onChange={e => setForm({ ...form, proposal_title: e.target.value })} className="bg-white/5 border-white/10 text-white" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-white/60 text-xs">Setup Fee</Label><Input type="number" value={form.setup_fee || 0} onChange={e => setForm({ ...form, setup_fee: Number(e.target.value) })} className="bg-white/5 border-white/10 text-white" /></div>
                      <div className="space-y-1"><Label className="text-white/60 text-xs">Monthly Fee</Label><Input type="number" value={form.monthly_fee || 0} onChange={e => setForm({ ...form, monthly_fee: Number(e.target.value) })} className="bg-white/5 border-white/10 text-white" /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-white/60 text-xs">Contract Term</Label><Input value={form.contract_term || ""} onChange={e => setForm({ ...form, contract_term: e.target.value })} className="bg-white/5 border-white/10 text-white" /></div>
                    <div className="space-y-1"><Label className="text-white/60 text-xs">Offer Summary</Label><Textarea value={form.offer_summary || ""} onChange={e => setForm({ ...form, offer_summary: e.target.value })} className="bg-white/5 border-white/10 text-white min-h-[80px]" /></div>
                    <div className="space-y-1"><Label className="text-white/60 text-xs">Internal Notes</Label><Textarea value={form.internal_summary || ""} onChange={e => setForm({ ...form, internal_summary: e.target.value })} className="bg-white/5 border-white/10 text-white min-h-[60px]" /></div>
                  </>
                ) : (
                  <div className="space-y-3 text-sm">
                    {proposal.offer_summary && <div><p className="text-[10px] text-white/40 uppercase mb-1">Offer Summary</p><p className="text-white/70">{proposal.offer_summary}</p></div>}
                    {proposal.internal_summary && <div><p className="text-[10px] text-white/40 uppercase mb-1">Internal Notes</p><p className="text-white/50">{proposal.internal_summary}</p></div>}
                    {!proposal.offer_summary && !proposal.internal_summary && <p className="text-white/30 text-center py-4">Click Edit to add details</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Linked Records</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {contact && (
                  <div className="p-2.5 rounded-lg bg-white/[0.03] flex items-center gap-3">
                    <User className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
                    <div><p className="text-xs text-white">{contact.full_name}</p><p className="text-[10px] text-white/40">{contact.email}</p></div>
                  </div>
                )}
                {company && (
                  <div className="p-2.5 rounded-lg bg-white/[0.03] flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
                    <p className="text-xs text-white">{company.company_name}</p>
                  </div>
                )}
                {deal && (
                  <div className="p-2.5 rounded-lg bg-white/[0.03] flex items-center gap-3 cursor-pointer hover:bg-white/[0.06]"
                    onClick={() => navigate(`/admin/deals/${proposal.deal_id}`)}>
                    <Briefcase className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
                    <div><p className="text-xs text-white">{deal.deal_name}</p><p className="text-[10px] text-white/40">${Number(deal.deal_value || 0).toLocaleString()}</p></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sections">
          <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-white/80">Proposal Sections</CardTitle>
                <Button size="sm" variant="ghost" className="text-[hsl(var(--nl-neon))] text-xs h-7" onClick={addSection}>
                  <Plus className="h-3 w-3 mr-1" /> Add Section
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {sections.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-6">No sections yet. Add sections to build your proposal.</p>
              ) : sections.map(s => (
                <div key={s.id} className="p-3 rounded-lg bg-white/[0.03] space-y-2">
                  <Input value={s.section_title} onChange={e => updateSection(s.id, "section_title", e.target.value)}
                    className="bg-white/5 border-white/10 text-white font-medium text-sm h-8" />
                  <Textarea value={s.content || ""} onChange={e => updateSection(s.id, "content", e.target.value)}
                    className="bg-white/5 border-white/10 text-white text-sm min-h-[60px]" placeholder="Section content…" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="line_items">
          <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Line Items</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {lineItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
                  <div>
                    <p className="text-xs text-white font-medium">{item.item_name}</p>
                    {item.item_description && <p className="text-[10px] text-white/40">{item.item_description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/50">{item.quantity} × ${Number(item.unit_price || 0).toLocaleString()}</span>
                    <span className="text-xs font-semibold text-white">${Number(item.total_price || 0).toLocaleString()}</span>
                    <button onClick={() => removeLineItem(item.id)} className="text-white/20 hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
              <div className="p-3 rounded-lg bg-white/[0.02] border border-dashed border-white/10 space-y-2">
                <p className="text-[10px] text-white/40 uppercase">Add Line Item</p>
                <div className="grid grid-cols-4 gap-2">
                  <Input value={newItem.item_name} onChange={e => setNewItem({ ...newItem, item_name: e.target.value })} placeholder="Name" className="bg-white/5 border-white/10 text-white text-xs col-span-2" />
                  <Input type="number" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })} placeholder="Qty" className="bg-white/5 border-white/10 text-white text-xs" />
                  <Input type="number" value={newItem.unit_price} onChange={e => setNewItem({ ...newItem, unit_price: Number(e.target.value) })} placeholder="Price" className="bg-white/5 border-white/10 text-white text-xs" />
                </div>
                <Button size="sm" className="bg-[hsl(var(--nl-electric))] text-xs h-7" onClick={addLineItem}><Plus className="h-3 w-3 mr-1" /> Add</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signatures">
          <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Signatures</CardTitle></CardHeader>
            <CardContent>
              {signatures.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-6">No signatures yet</p>
              ) : signatures.map(sig => (
                <div key={sig.id} className="p-3 rounded-lg bg-white/[0.03] mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs text-white font-medium">{sig.signer_name}</p>
                      <p className="text-[10px] text-white/40">{sig.signer_email}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px]">Signed</Badge>
                      <p className="text-[9px] text-white/30 mt-0.5">{new Date(sig.signed_at).toLocaleString()}</p>
                    </div>
                  </div>
                  {sig.signature_data && (
                    <div className="rounded bg-white/5 p-2">
                      <img src={sig.signature_data} alt="Signature" className="h-12 object-contain" />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="recipients">
          <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Recipients</CardTitle></CardHeader>
            <CardContent>
              {recipients.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-6">Recipients will be auto-populated from linked contacts when the proposal is sent.</p>
              ) : recipients.map(r => (
                <div key={r.id} className="p-2.5 rounded-lg bg-white/[0.03] flex items-center justify-between mb-2">
                  <div><p className="text-xs text-white">{r.full_name}</p><p className="text-[10px] text-white/40">{r.email}</p></div>
                  <div className="text-[10px] text-white/30">
                    {r.viewed_at ? "Viewed" : r.accepted_at ? "Accepted" : "Pending"}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery">
          <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Delivery History</CardTitle></CardHeader>
            <CardContent>
              {deliveries.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-6">No deliveries yet</p>
              ) : deliveries.map(d => (
                <div key={d.id} className="p-2.5 rounded-lg bg-white/[0.03] flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-white">{d.email_subject || "Proposal Email"}</p>
                    <p className="text-[10px] text-white/40">{d.recipient_email} · {d.delivery_channel}</p>
                  </div>
                  <Badge className={`text-[9px] ${d.delivery_status === "sent" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"}`}>
                    {d.delivery_status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
