import { useState, useEffect } from "react";
import { ModuleHelpPanel } from "@/components/ModuleHelpPanel";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { SetupBanner } from "@/components/SetupBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, DollarSign, TrendingUp, Plus, UserPlus, Briefcase, Target, Clock } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const PIPELINE_STAGES = [
  "new_lead", "contacted", "qualified", "appointment_booked",
  "proposal_sent", "negotiation", "closed_won", "closed_lost"
];

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead", contacted: "Contacted", qualified: "Qualified",
  appointment_booked: "Appt Booked", proposal_sent: "Proposal Sent",
  negotiation: "Negotiation", closed_won: "Closed Won", closed_lost: "Closed Lost",
};

const STAGE_COLORS: Record<string, string> = {
  new_lead: "bg-blue-50 text-blue-700", contacted: "bg-cyan-50 text-cyan-700",
  qualified: "bg-emerald-50 text-emerald-700", appointment_booked: "bg-violet-50 text-violet-700",
  proposal_sent: "bg-amber-50 text-amber-700", negotiation: "bg-orange-50 text-orange-700",
  closed_won: "bg-green-50 text-green-700", closed_lost: "bg-red-50 text-red-600",
};

const LEAD_SOURCES = ["Google Ads", "Organic", "Referral", "Social Media", "Direct", "Email", "Other"];

export default function CRM() {
  const { activeClientId } = useWorkspace();
  const [contacts, setContacts] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactOpen, setContactOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [detailContact, setDetailContact] = useState<any>(null);
  const [newContact, setNewContact] = useState({
    full_name: "", email: "", phone: "", address: "", tags: "",
    lead_source: "", pipeline_stage: "new_lead",
  });
  const [newDeal, setNewDeal] = useState({ deal_name: "", deal_value: "", pipeline_stage: "new_lead", contact_id: "" });

  const fetchData = async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [cRes, dRes, lRes, aRes, tRes] = await Promise.all([
      supabase.from("crm_contacts").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("crm_deals").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("crm_leads").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("crm_activities").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(30),
      supabase.from("crm_tasks").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(20),
    ]);
    setContacts(cRes.data || []);
    setDeals(dRes.data || []);
    setLeads(lRes.data || []);
    setActivities(aRes.data || []);
    setTasks(tRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeClientId]);

  const addContact = async () => {
    if (!activeClientId || !newContact.full_name) return;
    const tags = newContact.tags ? newContact.tags.split(",").map(t => t.trim()) : [];
    const { error } = await supabase.from("crm_contacts").insert({
      client_id: activeClientId, full_name: newContact.full_name,
      email: newContact.email || null, phone: newContact.phone || null,
      address: newContact.address || null, tags,
      lead_source: newContact.lead_source || null,
      pipeline_stage: newContact.pipeline_stage,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("crm_activities").insert({
      client_id: activeClientId, activity_type: "contact_created",
      activity_note: `Contact "${newContact.full_name}" created via ${newContact.lead_source || "manual entry"}`,
    });
    toast({ title: "Contact Added" });
    setNewContact({ full_name: "", email: "", phone: "", address: "", tags: "", lead_source: "", pipeline_stage: "new_lead" });
    setContactOpen(false);
    fetchData();
  };

  const addDeal = async () => {
    if (!activeClientId || !newDeal.deal_name) return;
    const { error } = await supabase.from("crm_deals").insert({
      client_id: activeClientId, deal_name: newDeal.deal_name,
      deal_value: parseFloat(newDeal.deal_value) || 0,
      pipeline_stage: newDeal.pipeline_stage,
      contact_id: newDeal.contact_id || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("crm_activities").insert({
      client_id: activeClientId, activity_type: "deal_created",
      activity_note: `Deal "${newDeal.deal_name}" created — $${parseFloat(newDeal.deal_value) || 0}`,
    });
    toast({ title: "Deal Added" });
    setNewDeal({ deal_name: "", deal_value: "", pipeline_stage: "new_lead", contact_id: "" });
    setDealOpen(false);
    fetchData();
  };

  const moveDealStage = async (dealId: string, stage: string) => {
    await supabase.from("crm_deals").update({ pipeline_stage: stage }).eq("id", dealId);
    await supabase.from("crm_activities").insert({
      client_id: activeClientId!, activity_type: "stage_changed",
      activity_note: `Deal moved to ${STAGE_LABELS[stage]}`, related_type: "deal", related_id: dealId,
    });
    fetchData();
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    await supabase.from("crm_tasks").update({ status }).eq("id", taskId);
    toast({ title: `Task ${status}` });
    fetchData();
  };

  const hasRealData = contacts.length > 0 || deals.length > 0;
  const totalContacts = contacts.length;
  const openDeals = deals.filter(d => d.status === "open");
  const pipelineValue = openDeals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
  const dealsWon = deals.filter(d => d.pipeline_stage === "closed_won");
  const wonValue = dealsWon.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
  const openTaskCount = tasks.filter(t => t.status === "open").length;

  const pipelineCounts = PIPELINE_STAGES.map(stage => ({
    stage, label: STAGE_LABELS[stage],
    count: deals.filter(d => d.pipeline_stage === stage).length,
    value: deals.filter(d => d.pipeline_stage === stage).reduce((s, d) => s + (Number(d.deal_value) || 0), 0),
  }));

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="CRM" description="Manage contacts, deals, and your sales pipeline" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6"><p className="text-muted-foreground">Select a workspace to view CRM data.</p></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="CRM" description="Manage contacts, deals, and your sales pipeline">
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => setContactOpen(true)}><UserPlus className="h-4 w-4" /> Contact</Button>
          <Button className="gap-1.5" onClick={() => setDealOpen(true)}><Briefcase className="h-4 w-4" /> Deal</Button>
        </div>
      </PageHeader>

      {!hasRealData && (
        <SetupBanner icon={Users} title="Build Your Sales Pipeline"
          description="Add contacts and create deals to start tracking your sales pipeline, revenue, and customer relationships."
          actionLabel="Add First Contact" onAction={() => setContactOpen(true)}
          secondaryLabel="Create First Deal" onSecondary={() => setDealOpen(true)} />
      )}

      <WidgetGrid columns="repeat(auto-fit, minmax(180px, 1fr))">
        <MetricCard label="Total Contacts" value={hasRealData ? String(totalContacts) : "—"} change={hasRealData ? `${contacts.length} records` : "Add contacts"} changeType="neutral" icon={Users} />
        <MetricCard label="Open Deals" value={hasRealData ? String(openDeals.length) : "—"} change={hasRealData ? "Active pipeline" : "Create deals"} changeType="neutral" icon={Building2} />
        <MetricCard label="Pipeline Value" value={hasRealData ? `$${pipelineValue.toLocaleString()}` : "—"} change={hasRealData ? `${openDeals.length} open deals` : "Add deal values"} changeType={hasRealData ? "positive" : "neutral"} icon={DollarSign} />
        <MetricCard label="Revenue Won" value={hasRealData ? `$${wonValue.toLocaleString()}` : "—"} change={hasRealData ? `${dealsWon.length} closed` : "Close deals"} changeType={hasRealData ? "positive" : "neutral"} icon={TrendingUp} />
        <MetricCard label="Open Tasks" value={String(openTaskCount)} change="" changeType="neutral" icon={Target} />
      </WidgetGrid>

      <div className="mt-6">
        <Tabs defaultValue="pipeline" className="w-full">
          <TabsList className="bg-secondary h-10 rounded-lg flex-wrap">
            <TabsTrigger value="pipeline" className="rounded-md text-sm">Pipeline</TabsTrigger>
            <TabsTrigger value="contacts" className="rounded-md text-sm">Contacts</TabsTrigger>
            <TabsTrigger value="deals" className="rounded-md text-sm">Deals</TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-md text-sm">Tasks</TabsTrigger>
            <TabsTrigger value="activity" className="rounded-md text-sm">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-4">
            <DataCard title="Revenue Pipeline">
              {!hasRealData ? (
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <TrendingUp className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">Your pipeline is empty</p>
                  <p className="text-xs text-muted-foreground mb-4">Add contacts and create deals to visualize your sales pipeline.</p>
                  <Button size="sm" onClick={() => setDealOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create First Deal</Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {pipelineCounts.map((s) => (
                    <motion.div key={s.stage} className="rounded-xl p-4 text-center" style={{ background: "hsla(211,96%,56%,.03)" }}
                      initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
                      <p className="text-[10px] font-medium text-muted-foreground leading-tight">{s.label}</p>
                      <p className="text-2xl font-semibold mt-2 tabular-nums">{s.count}</p>
                      <p className="text-[10px] mt-1 tabular-nums" style={{ color: "hsl(197 92% 48%)" }}>${s.value.toLocaleString()}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </DataCard>
          </TabsContent>

          <TabsContent value="contacts" className="mt-4">
            <DataCard title="Contacts">
              {contacts.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <Users className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No contacts yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Add your first contact to start building your CRM.</p>
                  <Button size="sm" onClick={() => setContactOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Contact</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Name</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Email</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Phone</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Source</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Stage</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3">Tags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((c) => (
                        <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary transition-colors cursor-pointer"
                          onClick={() => setDetailContact(c)}>
                          <td className="text-sm font-medium py-3 pr-4">{c.full_name}</td>
                          <td className="text-sm text-muted-foreground py-3 pr-4">{c.email || "—"}</td>
                          <td className="text-sm text-muted-foreground py-3 pr-4">{c.phone || "—"}</td>
                          <td className="text-xs text-muted-foreground py-3 pr-4">{c.lead_source || "—"}</td>
                          <td className="py-3 pr-4">
                            {c.pipeline_stage && (
                              <Badge className={`text-[10px] ${STAGE_COLORS[c.pipeline_stage] || "bg-secondary text-muted-foreground"}`}>
                                {STAGE_LABELS[c.pipeline_stage] || c.pipeline_stage}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3">
                            <div className="flex gap-1 flex-wrap">
                              {(c.tags || []).map((tag: string) => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{tag}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DataCard>
          </TabsContent>

          <TabsContent value="deals" className="mt-4">
            <DataCard title="Active Deals">
              {deals.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <Briefcase className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No deals yet</p>
                  <Button size="sm" onClick={() => setDealOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Deal</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {deals.map((d) => (
                    <motion.div key={d.id} className="flex items-center justify-between py-3 border-b border-border last:border-0"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{d.deal_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-[10px] ${STAGE_COLORS[d.pipeline_stage] || "bg-secondary text-muted-foreground"}`}>
                            {STAGE_LABELS[d.pipeline_stage] || d.pipeline_stage}
                          </Badge>
                          <span className="text-xs tabular-nums" style={{ color: "hsl(197 92% 48%)" }}>${Number(d.deal_value || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      {d.pipeline_stage !== "closed_won" && d.pipeline_stage !== "closed_lost" && (
                        <Select onValueChange={(v) => moveDealStage(d.id, v)}>
                          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Move stage" /></SelectTrigger>
                          <SelectContent>
                            {PIPELINE_STAGES.map(s => <SelectItem key={s} value={s} className="text-xs">{STAGE_LABELS[s]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </DataCard>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <DataCard title="Tasks">
              {tasks.length === 0 ? (
                <div className="py-8 text-center"><p className="text-sm text-muted-foreground">No tasks yet. Tasks are auto-created during onboarding and automation.</p></div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${t.status === "completed" ? "bg-primary/10" : "bg-accent/10"}`}>
                          {t.status === "completed" ? <Target className="h-4 w-4 text-primary" /> : <Clock className="h-4 w-4 text-accent" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{t.title}</p>
                          {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                          {t.due_date && <p className="text-[10px] text-muted-foreground">Due: {new Date(t.due_date).toLocaleDateString()}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={t.status === "completed" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}>
                          {t.status}
                        </Badge>
                        {t.status === "open" && (
                          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => updateTaskStatus(t.id, "completed")}>
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DataCard>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <DataCard title="Recent Activity">
              {activities.length === 0 ? (
                <div className="py-8 text-center"><p className="text-sm text-muted-foreground">Activity will appear here as you use your CRM.</p></div>
              ) : (
                <div className="space-y-3">
                  {activities.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                      <div className="h-2 w-2 rounded-full mt-2 shrink-0" style={{ background: "hsl(211 96% 56%)" }} />
                      <div>
                        <p className="text-sm">{a.activity_note}</p>
                        <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DataCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Contact Detail Sheet */}
      <Sheet open={!!detailContact} onOpenChange={() => setDetailContact(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detailContact && (
            <>
              <SheetHeader>
                <SheetTitle>{detailContact.full_name}</SheetTitle>
                <SheetDescription>Contact Details</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Email", value: detailContact.email },
                    { label: "Phone", value: detailContact.phone },
                    { label: "Address", value: detailContact.address },
                    { label: "Lead Source", value: detailContact.lead_source },
                    { label: "Lead Score", value: detailContact.lead_score },
                    { label: "Pipeline Stage", value: STAGE_LABELS[detailContact.pipeline_stage] || detailContact.pipeline_stage },
                    { label: "Lifetime Revenue", value: detailContact.lifetime_revenue ? `$${Number(detailContact.lifetime_revenue).toLocaleString()}` : "—" },
                    { label: "Appointments", value: detailContact.number_of_appointments },
                    { label: "First Contact", value: detailContact.first_contact_date ? new Date(detailContact.first_contact_date).toLocaleDateString() : "—" },
                    { label: "Last Interaction", value: detailContact.last_interaction_date ? new Date(detailContact.last_interaction_date).toLocaleDateString() : "—" },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{f.label}</p>
                      <p className="text-sm text-foreground mt-0.5">{f.value || "—"}</p>
                    </div>
                  ))}
                </div>
                {detailContact.tags?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Tags</p>
                    <div className="flex gap-1 flex-wrap">
                      {detailContact.tags.map((t: string) => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Contact Sheet */}
      <Sheet open={contactOpen} onOpenChange={setContactOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Add Contact</SheetTitle><SheetDescription>Create a new CRM contact</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Full Name *</Label><Input value={newContact.full_name} onChange={e => setNewContact(p => ({ ...p, full_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Address</Label><Input value={newContact.address} onChange={e => setNewContact(p => ({ ...p, address: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Lead Source</Label>
              <Select value={newContact.lead_source} onValueChange={v => setNewContact(p => ({ ...p, lead_source: v }))}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>{LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pipeline Stage</Label>
              <Select value={newContact.pipeline_stage} onValueChange={v => setNewContact(p => ({ ...p, pipeline_stage: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Tags (comma-separated)</Label><Input placeholder="Enterprise, Q2" value={newContact.tags} onChange={e => setNewContact(p => ({ ...p, tags: e.target.value }))} /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setContactOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addContact}>Add Contact</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Deal Sheet */}
      <Sheet open={dealOpen} onOpenChange={setDealOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Add Deal</SheetTitle><SheetDescription>Create a new pipeline deal</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Deal Name *</Label><Input value={newDeal.deal_name} onChange={e => setNewDeal(p => ({ ...p, deal_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Value ($)</Label><Input type="number" value={newDeal.deal_value} onChange={e => setNewDeal(p => ({ ...p, deal_value: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Pipeline Stage</Label>
              <Select value={newDeal.pipeline_stage} onValueChange={v => setNewDeal(p => ({ ...p, pipeline_stage: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {contacts.length > 0 && (
              <div className="space-y-2">
                <Label>Link Contact</Label>
                <Select value={newDeal.contact_id} onValueChange={v => setNewDeal(p => ({ ...p, contact_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDealOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addDeal}>Add Deal</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
