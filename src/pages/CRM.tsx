import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Users, Building2, DollarSign, TrendingUp, Plus, UserPlus, Briefcase, Target, Clock,
  Link2, RefreshCw, CheckCircle, AlertCircle, StickyNote, Search, Download, Upload,
  Calendar, Mail, Star, Activity
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const CRM_PROVIDERS = [
  { value: "gohighlevel", label: "GoHighLevel" },
  { value: "hubspot", label: "HubSpot" },
  { value: "salesforce", label: "Salesforce" },
  { value: "pipedrive", label: "Pipedrive" },
  { value: "zoho", label: "Zoho CRM" },
  { value: "other", label: "Other CRM" },
];

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

const STATUS_STYLE: Record<string, string> = {
  lead: "bg-blue-50 text-blue-700", customer: "bg-emerald-50 text-emerald-700",
  vip: "bg-amber-50 text-amber-700", inactive: "bg-muted text-muted-foreground", lost: "bg-red-50 text-red-600",
};

const LEAD_SOURCES = ["Google Ads", "Organic", "Referral", "Social Media", "Direct", "Email", "Other"];

export default function CRM() {
  const navigate = useNavigate();
  const { activeClientId } = useWorkspace();
  const [contacts, setContacts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactOpen, setContactOpen] = useState(false);
  const [dealOpen, setDealOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [crmMode, setCrmMode] = useState<string>("native");
  const [crmConnection, setCrmConnection] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [newContact, setNewContact] = useState({
    full_name: "", email: "", phone: "", address: "", tags: "",
    lead_source: "", pipeline_stage: "new_lead", company_id: "",
  });
  const [newDeal, setNewDeal] = useState({ deal_name: "", deal_value: "", pipeline_stage: "new_lead", contact_id: "", close_probability: "50" });
  const [newCompany, setNewCompany] = useState({ company_name: "", website: "", industry: "", phone: "", email: "" });
  const [newNote, setNewNote] = useState("");

  const fetchData = async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [cRes, coRes, dRes, lRes, aRes, tRes, clientRes, connRes, notesRes, apRes, emRes] = await Promise.all([
      supabase.from("crm_contacts").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("crm_companies").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("crm_deals").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("crm_leads").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("crm_activities").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(50),
      supabase.from("crm_tasks").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("clients").select("crm_mode").eq("id", activeClientId).maybeSingle(),
      supabase.from("crm_connections").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(1),
      supabase.from("crm_notes").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(30),
      supabase.from("calendar_events").select("*").eq("client_id", activeClientId).order("start_time", { ascending: false }).limit(50),
      supabase.from("email_messages").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(50),
    ]);
    setContacts(cRes.data || []);
    setCompanies(coRes.data || []);
    setDeals(dRes.data || []);
    setLeads(lRes.data || []);
    setActivities(aRes.data || []);
    setTasks(tRes.data || []);
    setNotes(notesRes.data || []);
    setAppointments(apRes.data || []);
    setEmails(emRes.data || []);
    if (clientRes.data?.crm_mode) setCrmMode(clientRes.data.crm_mode);
    if (connRes.data && connRes.data.length > 0) setCrmConnection(connRes.data[0]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeClientId]);

  // Actions
  const switchCrmMode = async (mode: string) => {
    if (!activeClientId) return;
    await supabase.from("clients").update({ crm_mode: mode } as any).eq("id", activeClientId);
    setCrmMode(mode);
    await supabase.from("audit_logs").insert({ client_id: activeClientId, action: "crm_mode_changed", module: "crm", metadata: { mode } });
    toast({ title: `CRM mode set to ${mode === "native" ? "Native" : "External"}` });
  };

  const connectExternalCrm = async () => {
    if (!activeClientId || !selectedProvider) return;
    const { data } = await supabase.from("crm_connections").insert({
      client_id: activeClientId, crm_provider_name: selectedProvider, connection_status: "pending",
    } as any).select().single();
    if (data) setCrmConnection(data);
    toast({ title: "External CRM connection initiated" });
  };

  const addContact = async () => {
    if (!activeClientId || !newContact.full_name) return;
    const tags = newContact.tags ? newContact.tags.split(",").map(t => t.trim()) : [];
    const { error } = await supabase.from("crm_contacts").insert({
      client_id: activeClientId, full_name: newContact.full_name,
      email: newContact.email || null, phone: newContact.phone || null,
      address: newContact.address || null, tags,
      lead_source: newContact.lead_source || null,
      pipeline_stage: newContact.pipeline_stage,
      company_id: newContact.company_id || null,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("crm_activities").insert({
      client_id: activeClientId, activity_type: "contact_created",
      activity_note: `Contact "${newContact.full_name}" created`,
    });
    toast({ title: "Contact Added" });
    setNewContact({ full_name: "", email: "", phone: "", address: "", tags: "", lead_source: "", pipeline_stage: "new_lead", company_id: "" });
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
      close_probability: parseInt(newDeal.close_probability) || 50,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("crm_activities").insert({
      client_id: activeClientId, activity_type: "deal_created",
      activity_note: `Deal "${newDeal.deal_name}" created — $${parseFloat(newDeal.deal_value) || 0}`,
    });
    toast({ title: "Deal Added" });
    setNewDeal({ deal_name: "", deal_value: "", pipeline_stage: "new_lead", contact_id: "", close_probability: "50" });
    setDealOpen(false);
    fetchData();
  };

  const addCompany = async () => {
    if (!activeClientId || !newCompany.company_name) return;
    const { error } = await supabase.from("crm_companies").insert({
      client_id: activeClientId, company_name: newCompany.company_name,
      website: newCompany.website || null, industry: newCompany.industry || null,
      phone: newCompany.phone || null, email: newCompany.email || null,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("crm_activities").insert({
      client_id: activeClientId, activity_type: "company_created",
      activity_note: `Company "${newCompany.company_name}" created`,
    });
    toast({ title: "Company Added" });
    setNewCompany({ company_name: "", website: "", industry: "", phone: "", email: "" });
    setCompanyOpen(false);
    fetchData();
  };

  const addNote = async (contactId?: string) => {
    if (!activeClientId || !newNote.trim()) return;
    await supabase.from("crm_notes").insert({ client_id: activeClientId, contact_id: contactId || null, content: newNote } as any);
    setNewNote("");
    toast({ title: "Note added" });
    fetchData();
  };

  const moveDealStage = async (dealId: string, stage: string) => {
    await supabase.from("crm_deals").update({ pipeline_stage: stage }).eq("id", dealId);
    await supabase.from("crm_activities").insert({
      client_id: activeClientId!, activity_type: "stage_changed",
      activity_note: `Deal moved to ${STAGE_LABELS[stage]}`, related_type: "deal", related_id: dealId,
    });
    // If won, update contact revenue
    if (stage === "closed_won") {
      const deal = deals.find(d => d.id === dealId);
      if (deal?.contact_id && deal.deal_value) {
        const contact = contacts.find(c => c.id === deal.contact_id);
        if (contact) {
          const newRevenue = (Number(contact.lifetime_revenue) || 0) + (Number(deal.deal_value) || 0);
          await supabase.from("crm_contacts").update({
            lifetime_revenue: newRevenue, contact_status: "customer",
            last_interaction_date: new Date().toISOString(),
          } as any).eq("id", deal.contact_id);
        }
      }
    }
    fetchData();
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    await supabase.from("crm_tasks").update({ status }).eq("id", taskId);
    toast({ title: `Task ${status}` });
    fetchData();
  };

  const exportCsv = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: `${filename}.csv exported` });
  };

  // Filters
  const q = searchQuery.toLowerCase();
  const filteredContacts = contacts.filter(c => {
    const matchesSearch = !q || c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q) || (c.tags || []).some((t: string) => t.toLowerCase().includes(q));
    const matchesStage = stageFilter === "all" || c.pipeline_stage === stageFilter;
    const matchesStatus = statusFilter === "all" || c.contact_status === statusFilter;
    return matchesSearch && matchesStage && matchesStatus;
  });
  const filteredDeals = deals.filter(d => {
    const matchesSearch = !q || d.deal_name?.toLowerCase().includes(q);
    const matchesStage = stageFilter === "all" || d.pipeline_stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const hasRealData = contacts.length > 0 || deals.length > 0;
  const totalContacts = contacts.length;
  const openDeals = deals.filter(d => d.status === "open");
  const pipelineValue = openDeals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
  const dealsWon = deals.filter(d => d.pipeline_stage === "closed_won");
  const wonValue = dealsWon.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
  const openTaskCount = tasks.filter(t => t.status === "open").length;

  const getContactName = (id: string) => contacts.find(c => c.id === id)?.full_name || "—";
  const getCompanyName = (id: string) => companies.find(c => c.id === id)?.company_name || "—";

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
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-1.5" onClick={() => setCompanyOpen(true)}><Building2 className="h-4 w-4" /> Company</Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setContactOpen(true)}><UserPlus className="h-4 w-4" /> Contact</Button>
          <Button className="gap-1.5" onClick={() => setDealOpen(true)}><Briefcase className="h-4 w-4" /> Deal</Button>
        </div>
      </PageHeader>

      <ModuleHelpPanel moduleName="CRM"
        description="This is where all your leads and customer records live. Every contact, deal, and interaction is tracked here."
        tips={["Click any contact row to open their full detail page", "Deals update revenue on contacts when marked Won", "Export any table as CSV using the export button"]} />

      {/* CRM Mode Selector */}
      <div className="mb-4 p-4 rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold text-foreground">CRM Mode</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {crmMode === "native" ? "Using built-in NewLight CRM" : "Connected to external CRM"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={crmMode === "native" ? "default" : "outline"} className="h-8 text-xs gap-1.5" onClick={() => switchCrmMode("native")}>
              <CheckCircle className="h-3.5 w-3.5" /> Native CRM
            </Button>
            <Button size="sm" variant={crmMode === "external" ? "default" : "outline"} className="h-8 text-xs gap-1.5" onClick={() => switchCrmMode("external")}>
              <Link2 className="h-3.5 w-3.5" /> External CRM
            </Button>
          </div>
        </div>
        {crmMode === "external" && (
          <div className="mt-4 pt-4 border-t border-border">
            {crmConnection ? (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${crmConnection.connection_status === "connected" ? "bg-primary/10" : "bg-accent/10"}`}>
                    {crmConnection.connection_status === "connected" ? <CheckCircle className="h-4 w-4 text-primary" /> : <AlertCircle className="h-4 w-4 text-accent" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{CRM_PROVIDERS.find(p => p.value === crmConnection.crm_provider_name)?.label || crmConnection.crm_provider_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Status: {crmConnection.connection_status} · Last sync: {crmConnection.last_synced_at ? new Date(crmConnection.last_synced_at).toLocaleString() : "Never"}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"><RefreshCw className="h-3 w-3" /> Sync Now</Button>
              </div>
            ) : (
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label className="text-xs mb-1.5 block">CRM Provider</Label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent>{CRM_PROVIDERS.map(p => <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button size="sm" className="h-9 text-xs gap-1" onClick={connectExternalCrm} disabled={!selectedProvider}>
                  <Link2 className="h-3.5 w-3.5" /> Connect
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {!hasRealData && (
        <SetupBanner icon={Users} title="Build Your Sales Pipeline"
          description="Add contacts and create deals to start tracking your sales pipeline, revenue, and customer relationships."
          actionLabel="Add First Contact" onAction={() => setContactOpen(true)}
          secondaryLabel="Create First Deal" onSecondary={() => setDealOpen(true)} />
      )}

      <WidgetGrid columns="repeat(auto-fit, minmax(160px, 1fr))">
        <MetricCard label="Contacts" value={hasRealData ? String(totalContacts) : "—"} change={hasRealData ? `${companies.length} companies` : "Add contacts"} changeType="neutral" icon={Users} />
        <MetricCard label="Open Deals" value={hasRealData ? String(openDeals.length) : "—"} change={hasRealData ? "Active pipeline" : "Create deals"} changeType="neutral" icon={Briefcase} />
        <MetricCard label="Pipeline Value" value={hasRealData ? `$${pipelineValue.toLocaleString()}` : "—"} change={hasRealData ? `${openDeals.length} open` : "—"} changeType={hasRealData ? "positive" : "neutral"} icon={DollarSign} />
        <MetricCard label="Revenue Won" value={hasRealData ? `$${wonValue.toLocaleString()}` : "—"} change={hasRealData ? `${dealsWon.length} closed` : "—"} changeType={hasRealData ? "positive" : "neutral"} icon={TrendingUp} />
        <MetricCard label="Open Tasks" value={String(openTaskCount)} change="" changeType="neutral" icon={Target} />
      </WidgetGrid>

      {/* Search & Filter Bar */}
      <div className="mt-4 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contacts, deals, companies, tags…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm" />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="All Stages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Stages</SelectItem>
            {PIPELINE_STAGES.map(s => <SelectItem key={s} value={s} className="text-xs">{STAGE_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Status</SelectItem>
            <SelectItem value="lead" className="text-xs">Lead</SelectItem>
            <SelectItem value="customer" className="text-xs">Customer</SelectItem>
            <SelectItem value="vip" className="text-xs">VIP</SelectItem>
            <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
            <SelectItem value="lost" className="text-xs">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <div className="mt-4">
        <Tabs defaultValue="contacts" className="w-full">
          <TabsList className="bg-secondary h-10 rounded-lg flex-wrap">
            <TabsTrigger value="contacts" className="rounded-md text-sm">Contacts</TabsTrigger>
            <TabsTrigger value="companies" className="rounded-md text-sm">Companies</TabsTrigger>
            <TabsTrigger value="deals" className="rounded-md text-sm">Deals</TabsTrigger>
            <TabsTrigger value="pipeline" className="rounded-md text-sm">Pipeline</TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-md text-sm">Tasks</TabsTrigger>
            <TabsTrigger value="appointments" className="rounded-md text-sm">Appointments</TabsTrigger>
            <TabsTrigger value="emails" className="rounded-md text-sm">Emails</TabsTrigger>
            <TabsTrigger value="notes" className="rounded-md text-sm">Notes</TabsTrigger>
            <TabsTrigger value="activity" className="rounded-md text-sm">Activity</TabsTrigger>
          </TabsList>

          {/* CONTACTS TABLE */}
          <TabsContent value="contacts" className="mt-4">
            <DataCard title="Contacts" action={contacts.length > 0 ? (
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => exportCsv(contacts, "contacts")}>
                <Download className="h-3 w-3" /> Export
              </Button>
            ) : undefined}>
              {contacts.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <Users className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No contacts yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Add your first contact to start building your CRM.</p>
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" onClick={() => setContactOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Contact</Button>
                    {crmMode === "external" && !crmConnection && (
                      <Button size="sm" variant="outline"><Link2 className="h-4 w-4 mr-1" /> Connect CRM</Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        {["Name", "Email", "Phone", "Company", "Stage", "Source", "Score", "Revenue", "Status"].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-muted-foreground py-3 pr-3 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContacts.map(c => (
                        <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/crm/contacts/${c.id}`)}>
                          <td className="text-sm font-medium py-3 pr-3">{c.full_name}</td>
                          <td className="text-sm text-muted-foreground py-3 pr-3">{c.email || "—"}</td>
                          <td className="text-sm text-muted-foreground py-3 pr-3">{c.phone || "—"}</td>
                          <td className="text-sm text-muted-foreground py-3 pr-3">{c.company_id ? getCompanyName(c.company_id) : "—"}</td>
                          <td className="py-3 pr-3">
                            {c.pipeline_stage && <Badge className={`text-[10px] ${STAGE_COLORS[c.pipeline_stage] || "bg-secondary text-muted-foreground"}`}>{STAGE_LABELS[c.pipeline_stage] || c.pipeline_stage}</Badge>}
                          </td>
                          <td className="text-xs text-muted-foreground py-3 pr-3">{c.lead_source || "—"}</td>
                          <td className="text-sm tabular-nums py-3 pr-3">{c.lead_score || 0}</td>
                          <td className="text-sm tabular-nums py-3 pr-3">${Number(c.lifetime_revenue || 0).toLocaleString()}</td>
                          <td className="py-3">
                            <Badge className={`text-[10px] ${STATUS_STYLE[c.contact_status] || "bg-secondary text-muted-foreground"}`}>{c.contact_status || "lead"}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DataCard>
          </TabsContent>

          {/* COMPANIES TABLE */}
          <TabsContent value="companies" className="mt-4">
            <DataCard title="Companies" action={companies.length > 0 ? (
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => exportCsv(companies, "companies")}>
                <Download className="h-3 w-3" /> Export
              </Button>
            ) : undefined}>
              {companies.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <Building2 className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No companies yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Add a company to organize your contacts and deals.</p>
                  <Button size="sm" onClick={() => setCompanyOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Company</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        {["Company", "Website", "Industry", "Phone", "Contacts", "Revenue"].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-muted-foreground py-3 pr-3 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {companies.filter(co => !q || co.company_name?.toLowerCase().includes(q)).map(co => {
                        const coContacts = contacts.filter(c => c.company_id === co.id);
                        const coRevenue = deals.filter(d => d.company_id === co.id && d.pipeline_stage === "closed_won").reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
                        return (
                          <tr key={co.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/crm/companies/${co.id}`)}>
                            <td className="text-sm font-medium py-3 pr-3">{co.company_name}</td>
                            <td className="text-sm text-muted-foreground py-3 pr-3">{co.website || "—"}</td>
                            <td className="text-sm text-muted-foreground py-3 pr-3">{co.industry || "—"}</td>
                            <td className="text-sm text-muted-foreground py-3 pr-3">{co.phone || "—"}</td>
                            <td className="text-sm tabular-nums py-3 pr-3">{coContacts.length}</td>
                            <td className="text-sm tabular-nums py-3">${coRevenue.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </DataCard>
          </TabsContent>

          {/* DEALS TABLE */}
          <TabsContent value="deals" className="mt-4">
            <DataCard title="Deals" action={deals.length > 0 ? (
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => exportCsv(deals, "deals")}>
                <Download className="h-3 w-3" /> Export
              </Button>
            ) : undefined}>
              {deals.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <Briefcase className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No deals yet</p>
                  <Button size="sm" onClick={() => setDealOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create Deal</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        {["Deal", "Contact", "Stage", "Value", "Probability", "Expected Close", "Status", "Action"].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-muted-foreground py-3 pr-3 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDeals.map(d => (
                        <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                          <td className="text-sm font-medium py-3 pr-3">{d.deal_name}</td>
                          <td className="text-sm text-muted-foreground py-3 pr-3 cursor-pointer hover:text-primary"
                            onClick={() => d.contact_id && navigate(`/crm/contacts/${d.contact_id}`)}>
                            {d.contact_id ? getContactName(d.contact_id) : "—"}
                          </td>
                          <td className="py-3 pr-3">
                            <Badge className={`text-[10px] ${STAGE_COLORS[d.pipeline_stage] || "bg-secondary text-muted-foreground"}`}>
                              {STAGE_LABELS[d.pipeline_stage] || d.pipeline_stage}
                            </Badge>
                          </td>
                          <td className="text-sm tabular-nums py-3 pr-3">${Number(d.deal_value || 0).toLocaleString()}</td>
                          <td className="text-sm tabular-nums py-3 pr-3">{d.close_probability || 0}%</td>
                          <td className="text-sm text-muted-foreground py-3 pr-3">{d.expected_close_date || "—"}</td>
                          <td className="py-3 pr-3"><Badge variant="outline" className="text-[10px]">{d.status}</Badge></td>
                          <td className="py-3">
                            {d.pipeline_stage !== "closed_won" && d.pipeline_stage !== "closed_lost" && (
                              <Select onValueChange={v => moveDealStage(d.id, v)}>
                                <SelectTrigger className="w-[120px] h-7 text-[10px]"><SelectValue placeholder="Move…" /></SelectTrigger>
                                <SelectContent>{PIPELINE_STAGES.map(s => <SelectItem key={s} value={s} className="text-xs">{STAGE_LABELS[s]}</SelectItem>)}</SelectContent>
                              </Select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DataCard>
          </TabsContent>

          {/* PIPELINE BOARD */}
          <TabsContent value="pipeline" className="mt-4">
            <div className="flex gap-3 overflow-x-auto pb-4">
              {PIPELINE_STAGES.map(stage => {
                const stageDeals = deals.filter(d => d.pipeline_stage === stage);
                const stageValue = stageDeals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
                return (
                  <div key={stage} className="min-w-[220px] flex-1"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { const id = e.dataTransfer.getData("dealId"); if (id) moveDealStage(id, stage); }}>
                    <div className="rounded-xl border border-border bg-card">
                      <div className="px-3 py-2.5 border-b border-border">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-semibold">{STAGE_LABELS[stage]}</h3>
                          <span className="text-[10px] text-muted-foreground tabular-nums">{stageDeals.length}</span>
                        </div>
                        <p className="text-[10px] tabular-nums mt-0.5" style={{ color: "hsl(197 92% 48%)" }}>${stageValue.toLocaleString()}</p>
                      </div>
                      <div className="p-2 space-y-2 min-h-[120px]">
                        {stageDeals.map(d => (
                          <div key={d.id} draggable onDragStart={e => e.dataTransfer.setData("dealId", d.id)}
                            className="card-widget p-3 rounded-xl cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
                            <p className="text-sm font-medium truncate">{d.deal_name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate cursor-pointer hover:text-primary"
                              onClick={() => d.contact_id && navigate(`/crm/contacts/${d.contact_id}`)}>
                              {d.contact_id ? getContactName(d.contact_id) : "Unlinked"}
                            </p>
                            <p className="text-xs font-medium tabular-nums mt-1" style={{ color: "hsl(197 92% 48%)" }}>${Number(d.deal_value || 0).toLocaleString()}</p>
                          </div>
                        ))}
                        {stageDeals.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-6">No deals</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* TASKS TABLE */}
          <TabsContent value="tasks" className="mt-4">
            <DataCard title="Tasks">
              {tasks.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No tasks yet. Tasks are auto-created during automation and onboarding.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-border">
                      {["Title", "Due Date", "Priority", "Status", "Action"].map(h => (
                        <th key={h} className="text-left text-xs font-medium text-muted-foreground py-3 pr-3">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {tasks.map(t => (
                        <tr key={t.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                          <td className="text-sm font-medium py-3 pr-3">
                            {t.title}
                            {t.description && <p className="text-[10px] text-muted-foreground">{t.description}</p>}
                          </td>
                          <td className="text-sm text-muted-foreground py-3 pr-3">{t.due_date ? new Date(t.due_date).toLocaleDateString() : "—"}</td>
                          <td className="py-3 pr-3">
                            <Badge variant="outline" className={`text-[10px] ${t.priority === "high" ? "border-red-300 text-red-600" : t.priority === "medium" ? "border-amber-300 text-amber-600" : ""}`}>
                              {t.priority}
                            </Badge>
                          </td>
                          <td className="py-3 pr-3"><Badge variant="outline" className="text-[10px]">{t.status}</Badge></td>
                          <td className="py-3">
                            {t.status === "open" && (
                              <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => updateTaskStatus(t.id, "completed")}>Complete</Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DataCard>
          </TabsContent>

          {/* APPOINTMENTS TABLE */}
          <TabsContent value="appointments" className="mt-4">
            <DataCard title="Appointments" action={appointments.length > 0 ? (
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => exportCsv(appointments, "appointments")}>
                <Download className="h-3 w-3" /> Export
              </Button>
            ) : undefined}>
              {appointments.length === 0 ? (
                <div className="py-8 text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No appointments yet. Schedule one from the Calendar.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-border">
                      {["Title", "Contact", "Date", "Time", "Status", "Location", "Source"].map(h => (
                        <th key={h} className="text-left text-xs font-medium text-muted-foreground py-3 pr-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {appointments.map(ap => (
                        <tr key={ap.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                          <td className="text-sm font-medium py-3 pr-3">{ap.title}</td>
                          <td className="text-sm text-muted-foreground py-3 pr-3 cursor-pointer hover:text-primary"
                            onClick={() => ap.contact_id && navigate(`/crm/contacts/${ap.contact_id}`)}>
                            {ap.contact_name || (ap.contact_id ? getContactName(ap.contact_id) : "—")}
                          </td>
                          <td className="text-sm text-muted-foreground py-3 pr-3">{new Date(ap.start_time).toLocaleDateString()}</td>
                          <td className="text-sm text-muted-foreground py-3 pr-3">{new Date(ap.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                          <td className="py-3 pr-3"><Badge variant="outline" className="text-[10px]">{ap.calendar_status}</Badge></td>
                          <td className="text-sm text-muted-foreground py-3 pr-3">{ap.location || "—"}</td>
                          <td className="text-xs text-muted-foreground py-3">{ap.booking_source || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DataCard>
          </TabsContent>

          {/* EMAILS TABLE */}
          <TabsContent value="emails" className="mt-4">
            <DataCard title="Emails">
              {emails.length === 0 ? (
                <div className="py-8 text-center">
                  <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No emails linked yet. Connect your email from the Email module.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-border">
                      {["Contact", "Subject", "Direction", "From/To", "Date"].map(h => (
                        <th key={h} className="text-left text-xs font-medium text-muted-foreground py-3 pr-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {emails.map(e => (
                        <tr key={e.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                          <td className="text-sm text-muted-foreground py-3 pr-3 cursor-pointer hover:text-primary"
                            onClick={() => e.contact_id && navigate(`/crm/contacts/${e.contact_id}`)}>
                            {e.contact_id ? getContactName(e.contact_id) : e.from_name || "Unknown"}
                          </td>
                          <td className="text-sm font-medium py-3 pr-3 truncate max-w-[200px]">{e.subject || "(no subject)"}</td>
                          <td className="py-3 pr-3">
                            <Badge variant="outline" className={`text-[10px] ${e.direction === "inbound" ? "border-primary/30 text-primary" : ""}`}>
                              {e.direction}
                            </Badge>
                          </td>
                          <td className="text-sm text-muted-foreground py-3 pr-3 truncate max-w-[160px]">{e.direction === "inbound" ? e.from_address : e.to_address}</td>
                          <td className="text-xs text-muted-foreground py-3">{e.sent_at ? new Date(e.sent_at).toLocaleString() : new Date(e.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DataCard>
          </TabsContent>

          {/* NOTES */}
          <TabsContent value="notes" className="mt-4">
            <DataCard title="Notes">
              <div className="mb-4 flex gap-2">
                <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a quick note…" className="min-h-[44px] flex-1 resize-none" rows={2} />
                <Button size="icon" className="shrink-0 self-end" onClick={() => addNote()} disabled={!newNote.trim()}>
                  <StickyNote className="h-4 w-4" />
                </Button>
              </div>
              {notes.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No notes yet.</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((n: any) => (
                    <div key={n.id} className="p-3 rounded-xl bg-secondary/50 border border-border">
                      <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </DataCard>
          </TabsContent>

          {/* ACTIVITY */}
          <TabsContent value="activity" className="mt-4">
            <DataCard title="Recent Activity">
              {activities.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Activity will appear as you use your CRM.</p>
              ) : (
                <div className="space-y-3">
                  {activities.map(a => (
                    <div key={a.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                      <div className="h-2 w-2 rounded-full mt-2 shrink-0" style={{ background: "hsl(211 96% 56%)" }} />
                      <div>
                        <p className="text-sm">{a.activity_note || a.activity_type}</p>
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

      {/* Add Contact Sheet */}
      <Sheet open={contactOpen} onOpenChange={setContactOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Add Contact</SheetTitle><SheetDescription>Create a new CRM contact</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Full Name *</Label><Input value={newContact.full_name} onChange={e => setNewContact(p => ({ ...p, full_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={newContact.phone} onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Address</Label><Input value={newContact.address} onChange={e => setNewContact(p => ({ ...p, address: e.target.value }))} /></div>
            {companies.length > 0 && (
              <div className="space-y-2">
                <Label>Company</Label>
                <Select value={newContact.company_id} onValueChange={v => setNewContact(p => ({ ...p, company_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{companies.map(co => <SelectItem key={co.id} value={co.id}>{co.company_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
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
            <div className="space-y-2"><Label>Probability (%)</Label><Input type="number" value={newDeal.close_probability} onChange={e => setNewDeal(p => ({ ...p, close_probability: e.target.value }))} /></div>
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

      {/* Add Company Sheet */}
      <Sheet open={companyOpen} onOpenChange={setCompanyOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Add Company</SheetTitle><SheetDescription>Create a new company record</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Company Name *</Label><Input value={newCompany.company_name} onChange={e => setNewCompany(p => ({ ...p, company_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Website</Label><Input value={newCompany.website} onChange={e => setNewCompany(p => ({ ...p, website: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Industry</Label><Input value={newCompany.industry} onChange={e => setNewCompany(p => ({ ...p, industry: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={newCompany.phone} onChange={e => setNewCompany(p => ({ ...p, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={newCompany.email} onChange={e => setNewCompany(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCompanyOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addCompany}>Add Company</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
