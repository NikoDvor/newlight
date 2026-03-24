import { motion } from "framer-motion";
import { Plus, Search, Building2, ExternalLink, Copy, UserPlus, Mail, CheckCircle2, AlertCircle, Settings, Trash2, Pause, Play, Activity, Wand2, Loader2, Zap, Phone, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DeleteClientDialog } from "@/components/DeleteClientDialog";
import { LogoUploader } from "@/components/LogoUploader";
import { provisionWorkspaceDefaults, computeWorkspaceReadiness, type WorkspaceReadinessResult } from "@/lib/workspaceProvisioner";
interface Client {
  id: string;
  business_name: string;
  workspace_slug: string;
  industry: string | null;
  service_package: string | null;
  status: string;
  owner_name: string | null;
  owner_email: string | null;
  created_at: string;
  onboarding_stage: string;
}

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [readiness, setReadiness] = useState<Record<string, WorkspaceReadinessResult>>({});
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [provisioning, setProvisioning] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{ email: string; sent: boolean; link: string | null } | null>(null);
  const [deleteClient, setDeleteClient] = useState<{ id: string; business_name: string } | null>(null);
  
  const [form, setForm] = useState({
    business_name: "", workspace_slug: "", industry: "", primary_location: "",
    timezone: "America/Los_Angeles", service_package: "enterprise", owner_name: "", owner_email: "",
    logo_url: "", primary_color: "#3B82F6", secondary_color: "#06B6D4", welcome_message: "",
  });
  const { setViewMode, setActiveClientId } = useWorkspace();
  const navigate = useNavigate();

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("*").neq("status", "archived").order("created_at", { ascending: false });
    const list = (data ?? []) as Client[];
    setClients(list);
    // Fetch readiness for all clients in parallel
    const results: Record<string, WorkspaceReadinessResult> = {};
    await Promise.all(list.map(async (c) => {
      results[c.id] = await computeWorkspaceReadiness(c.id);
    }));
    setReadiness(results);
  };

  useEffect(() => { fetchClients(); }, []);

  const [createdClient, setCreatedClient] = useState<Client | null>(null);

  const handleCreate = async () => {
    if (!form.business_name || !form.workspace_slug) {
      toast.error("Business name and workspace slug are required");
      return;
    }
    if (!form.owner_email) {
      toast.error("Owner email is required to create a login account");
      return;
    }
    setCreating(true);
    const slug = form.workspace_slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    // Check slug uniqueness
    const { data: slugCheck } = await supabase.from("clients").select("id").eq("workspace_slug", slug).maybeSingle();
    if (slugCheck) {
      toast.error("A workspace with this slug already exists. Choose a different slug.");
      setCreating(false);
      return;
    }

    // 1. Create client record
    const { data, error } = await supabase.from("clients").insert({
      business_name: form.business_name,
      workspace_slug: slug,
      industry: form.industry || null,
      primary_location: form.primary_location || null,
      timezone: form.timezone,
      service_package: form.service_package,
      owner_name: form.owner_name || null,
      owner_email: form.owner_email,
    }).select().single();

    if (error) {
      toast.error(`Workspace creation failed: ${error.message}`);
      setCreating(false);
      return;
    }

    if (!data) {
      toast.error("Workspace creation failed: no data returned");
      setCreating(false);
      return;
    }

    // 2. Provision workspace base resources in parallel
    const integrations = ["Google Analytics", "Google Search Console", "Google Business Profile", "Meta / Instagram", "Twilio", "Stripe", "Zoom"];
    await Promise.all([
      supabase.from("provision_queue").insert({ client_id: data.id }),
      supabase.from("client_integrations").insert(integrations.map(name => ({ client_id: data.id, integration_name: name }))),
      supabase.from("onboarding_progress").insert({ client_id: data.id }),
      supabase.from("client_branding").insert({
        client_id: data.id,
        company_name: form.business_name,
        logo_url: form.logo_url || null,
        primary_color: form.primary_color || "#3B82F6",
        secondary_color: form.secondary_color || "#06B6D4",
        welcome_message: form.welcome_message || "Welcome to your business dashboard",
      }),
      supabase.from("client_health_scores").insert({ client_id: data.id }),
    ]);


    // 3. Full app provisioning — creates calendars, services, forms, content blocks, workspace user, billing stub, recommendations
    try {
      const result = await provisionWorkspaceDefaults(data.id, {
        industry: form.industry,
        timezone: form.timezone,
        skipIfExists: true,
        ownerEmail: form.owner_email,
        ownerName: form.owner_name,
      });
      if (result.provisionedItems.length > 0) {
        console.log(`Full app provisioned: ${result.provisionedItems.length} items`);
      }
    } catch (provErr: any) {
      toast.error(`Workspace created but full provisioning failed: ${provErr.message}`);
    }

    // 4. Auto-create auth account for client owner
    try {
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke("invite-user", {
        body: {
          email: form.owner_email,
          role: "client_owner",
          client_id: data.id,
        },
      });

      if (inviteError) {
        toast.error(`Workspace created but invite failed: ${inviteError.message}`);
        setInviteResult({ email: form.owner_email, sent: false, link: null });
      } else if (inviteData) {
        if (inviteData.already_existed) {
          toast.success("Workspace created! Existing user linked to this new workspace.");
          setInviteResult({ email: form.owner_email, sent: false, link: null });
        } else if (inviteData.invite_email_sent) {
          toast.success("Workspace created! Invite email sent to client.");
          setInviteResult({ email: form.owner_email, sent: true, link: null });
        } else if (inviteData.setup_link) {
          toast.success("Workspace created! Copy the setup link below for the client.");
          setInviteResult({ email: form.owner_email, sent: false, link: inviteData.setup_link });
        } else {
          toast.success("Workspace created and user account linked!");
          setInviteResult({ email: form.owner_email, sent: false, link: null });
        }
      }
    } catch (err: any) {
      toast.error(`Workspace created but invite failed: ${err.message}`);
      setInviteResult({ email: form.owner_email, sent: false, link: null });
    }

    // 5. Update provision status
    await supabase.from("provision_queue").update({ provision_status: "setup_in_progress" }).eq("client_id", data.id);

    // Store created client for post-create actions
    setCreatedClient(data as Client);

    setCreating(false);
    fetchClients();
  };

  const handleResendInvite = async (client: Client) => {
    if (!client.owner_email) {
      toast.error("No owner email on file");
      return;
    }
    const { data, error } = await supabase.functions.invoke("invite-user", {
      body: { email: client.owner_email, role: "client_owner", client_id: client.id },
    });
    if (error) {
      toast.error(error.message);
    } else if (data?.invite_email_sent) {
      toast.success("Invite resent!");
    } else if (data?.setup_link) {
      navigator.clipboard.writeText(data.setup_link);
      toast.success("Setup link copied to clipboard");
    } else {
      toast.success("User account already exists and is linked");
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Setup link copied!");
  };

  const resetForm = () => {
    setShowCreate(false);
    setInviteResult(null);
    setCreatedClient(null);
    setForm({
      business_name: "", workspace_slug: "", industry: "", primary_location: "",
      timezone: "America/Los_Angeles", service_package: "enterprise", owner_name: "", owner_email: "",
      logo_url: "", primary_color: "#3B82F6", secondary_color: "#06B6D4", welcome_message: "",
    });
  };

  const openCreatedWorkspace = () => {
    if (!createdClient) return;
    setViewMode("workspace");
    setActiveClientId(createdClient.id);
    resetForm();
    navigate("/");
  };

  const openWorkspace = (client: Client) => {
    setViewMode("workspace");
    setActiveClientId(client.id);
    navigate("/");
  };

  const handleSuspend = async (client: Client) => {
    const newStatus = client.status === "suspended" ? "active" : "suspended";
    await supabase.from("clients").update({ status: newStatus }).eq("id", client.id);
    await supabase.from("audit_logs").insert({
      action: newStatus === "suspended" ? "client_suspended" : "client_unsuspended",
      client_id: client.id, module: "clients",
      metadata: { business_name: client.business_name },
    });
    toast.success(`${client.business_name} ${newStatus === "suspended" ? "suspended" : "reactivated"}`);
    fetchClients();
  };

  const handleReProvision = async (client: Client) => {
    setProvisioning(client.id);
    try {
      const result = await provisionWorkspaceDefaults(client.id, {
        industry: client.industry,
        skipIfExists: true,
      });
      if (result.provisionedItems.length > 0) {
        toast.success(`Applied starter template: ${result.provisionedItems.length} item(s) created`);
      } else {
        toast.info("Workspace already has starter content — nothing new to create");
      }
      fetchClients();
    } catch (err: any) {
      toast.error(err.message || "Provisioning failed");
    } finally {
      setProvisioning(null);
    }
  };

  const filtered = clients.filter(c => c.business_name.toLowerCase().includes(search.toLowerCase()));

  const onboardingStageColor = (stage: string) => {
    switch (stage) {
      case "active": return "bg-[hsla(152,60%,44%,.15)] text-[hsl(152,60%,55%)]";
      case "awaiting_payment": return "bg-[hsla(40,96%,60%,.15)] text-[hsl(40,96%,68%)]";
      case "activation": case "activation_in_progress": return "bg-[hsla(211,96%,60%,.15)] text-[hsl(var(--nl-sky))]";
      case "provisioned": case "discovery": return "bg-[hsla(270,60%,60%,.15)] text-[hsl(270,60%,68%)]";
      default: return "bg-white/5 text-white/40";
    }
  };

  const OnboardingStageCell = ({ stage }: { stage: string }) => (
    <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize whitespace-nowrap ${onboardingStageColor(stage)}`}>
      {stage.replace(/_/g, " ")}
    </span>
  );

  const statusColor = (s: string) => {
    if (s === "active") return "bg-[hsla(197,92%,68%,.15)] text-[hsl(var(--nl-sky))]";
    if (s === "provisioning") return "bg-[hsla(211,96%,60%,.15)] text-[hsl(var(--nl-neon))]";
    if (s === "setup_in_progress") return "bg-[hsla(40,96%,60%,.15)] text-[hsl(40,96%,68%)]";
    if (s === "suspended") return "bg-[hsla(0,70%,50%,.15)] text-[hsl(0,70%,68%)]";
    return "bg-white/5 text-white/40";
  };

  const formFields = [
    { label: "Business Name *", key: "business_name", placeholder: "Acme Corp" },
    { label: "Workspace Slug *", key: "workspace_slug", placeholder: "acme-corp" },
    { label: "Industry", key: "industry", placeholder: "e.g. Dental, Auto, Restaurant" },
    { label: "Primary Location", key: "primary_location", placeholder: "City, State" },
    { label: "Owner Name", key: "owner_name", placeholder: "John Smith" },
    { label: "Owner Email *", key: "owner_email", placeholder: "john@example.com", type: "email" },
  ];

  const brandingFields = [
    { label: "Welcome Message", key: "welcome_message", placeholder: "Welcome to your dashboard" },
  ];

  return (
    <div className="space-y-6">
      {/* Share onboarding link banner */}
      <div className="rounded-xl p-3 flex items-center justify-between flex-wrap gap-3" style={{
        background: "hsla(211,96%,60%,.08)",
        border: "1px solid hsla(211,96%,60%,.15)",
      }}>
        <div className="flex items-center gap-2 min-w-0">
          <ExternalLink className="h-4 w-4 text-[hsl(var(--nl-sky))] shrink-0" />
          <span className="text-sm text-white/70">Public onboarding form:</span>
          <code className="text-xs text-white/50 truncate">{window.location.origin}/get-started</code>
        </div>
        <Button
          size="sm"
          className="bg-white/10 hover:bg-white/20 text-white shrink-0"
          onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/get-started`); toast.success("Onboarding link copied!"); }}
        >
          <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
        </Button>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-sm text-white/50 mt-1">{clients.length} client workspaces</p>
        </div>
        <Dialog open={showCreate} onOpenChange={(open) => { if (!open) resetForm(); else setShowCreate(true); }}>
          <DialogTrigger asChild>
            <Button className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
              <Plus className="h-4 w-4 mr-1" /> Create Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" style={{ background: "hsl(218 35% 12%)", border: "1px solid hsla(211,96%,60%,.15)", color: "white" }}>
            <DialogHeader>
              <DialogTitle className="text-white">Create Client Workspace</DialogTitle>
            </DialogHeader>

            {/* Invite result panel */}
            {inviteResult && (
              <div className="rounded-xl p-4 mb-2" style={{
                background: inviteResult.sent ? "hsla(160,60%,40%,.12)" : "hsla(211,96%,60%,.08)",
                border: `1px solid ${inviteResult.sent ? "hsla(160,60%,50%,.25)" : "hsla(211,96%,60%,.15)"}`,
              }}>
                {inviteResult.sent ? (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-white">Invite email sent!</p>
                      <p className="text-xs text-white/50 mt-1">
                        A password setup email has been sent to <span className="text-white/70 font-medium">{inviteResult.email}</span>. They can set their password and log in.
                      </p>
                    </div>
                  </div>
                ) : inviteResult.link ? (
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-[hsl(var(--nl-sky))] mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">Email not configured</p>
                      <p className="text-xs text-white/50 mt-1 mb-2">
                        Share this secure setup link with <span className="text-white/70 font-medium">{inviteResult.email}</span>:
                      </p>
                      <div className="flex gap-2">
                        <Input value={inviteResult.link} readOnly className="bg-white/[0.06] border-white/10 text-white/70 text-[11px] flex-1" />
                        <Button size="sm" onClick={() => copyLink(inviteResult.link!)} className="bg-white/10 hover:bg-white/20 text-white shrink-0">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-white">Account linked</p>
                      <p className="text-xs text-white/50 mt-1">User already exists and has been assigned to this workspace.</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  {createdClient && (
                    <Button onClick={openCreatedWorkspace} className="flex-1 bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open Workspace
                    </Button>
                  )}
                  <Button onClick={resetForm} variant={createdClient ? "outline" : "default"} className={createdClient ? "border-white/10 text-white hover:bg-white/10" : "flex-1 bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white"}>
                    Done
                  </Button>
                </div>
              </div>
            )}

            {!inviteResult && (
              <div className="space-y-3 mt-2">
                {formFields.map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-white/50 mb-1 block">{f.label}</label>
                    <Input
                      type={(f as any).type || "text"}
                      value={(form as any)[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Timezone</label>
                  <select
                    value={form.timezone}
                    onChange={e => setForm(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full h-10 rounded-md bg-white/[0.06] border border-white/10 text-white text-sm px-3"
                  >
                    <option value="America/New_York">Eastern</option>
                    <option value="America/Chicago">Central</option>
                    <option value="America/Denver">Mountain</option>
                    <option value="America/Los_Angeles">Pacific</option>
                    <option value="Europe/London">London</option>
                    <option value="Australia/Sydney">Sydney</option>
                  </select>
                </div>

                {/* Branding Section */}
                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs font-semibold text-white/70 mb-3 uppercase tracking-wider">Workspace Branding (Optional)</p>
                  <LogoUploader value={form.logo_url} onChange={url => setForm(prev => ({ ...prev, logo_url: url }))} label="Logo" dark={true} className="mb-3" />
                  {brandingFields.map(f => (
                    <div key={f.key} className="mb-3">
                      <label className="text-xs text-white/50 mb-1 block">{f.label}</label>
                      <Input
                        value={(form as any)[f.key]}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
                      />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-white/50 mb-1 block">Primary Color</label>
                      <div className="flex gap-2">
                        <input type="color" value={form.primary_color} onChange={e => setForm(prev => ({ ...prev, primary_color: e.target.value }))} className="h-10 w-10 rounded-lg border-0 cursor-pointer bg-transparent" />
                        <Input value={form.primary_color} onChange={e => setForm(prev => ({ ...prev, primary_color: e.target.value }))} className="bg-white/[0.06] border-white/10 text-white flex-1" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-white/50 mb-1 block">Secondary Color</label>
                      <div className="flex gap-2">
                        <input type="color" value={form.secondary_color} onChange={e => setForm(prev => ({ ...prev, secondary_color: e.target.value }))} className="h-10 w-10 rounded-lg border-0 cursor-pointer bg-transparent" />
                        <Input value={form.secondary_color} onChange={e => setForm(prev => ({ ...prev, secondary_color: e.target.value }))} className="bg-white/[0.06] border-white/10 text-white flex-1" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 rounded-lg p-3 mt-1" style={{ background: "hsla(211,96%,60%,.06)", border: "1px solid hsla(211,96%,60%,.1)" }}>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <UserPlus className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
                    <span>A login account will be automatically created for the owner email.</span>
                  </div>
                </div>

                <Button onClick={handleCreate} disabled={creating} className="w-full bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white mt-2">
                  {creating ? "Creating Workspace..." : "Create Workspace & Send Invite"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="pl-9 bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
        />
      </div>

      <Card className="border-0 bg-white/[0.04] backdrop-blur-sm overflow-hidden" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Client Name", "Industry", "Package", "Readiness", "Onboarding", "Status", "Owner", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] text-white/40 uppercase tracking-wider font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
                      <span className="text-white font-medium">{c.business_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/60">{c.industry || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsla(211,96%,60%,.1)] text-[hsl(var(--nl-neon))] capitalize">{c.service_package}</span>
                  </td>
                  <td className="px-4 py-3">
                    {readiness[c.id] ? (
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <Progress value={readiness[c.id].percentage} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-white/50 shrink-0">{readiness[c.id].percentage}%</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-white/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <OnboardingStageCell stage={c.onboarding_stage} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${statusColor(c.status)}`}>{c.status.replace(/_/g, " ")}</span>
                      {c.onboarding_stage === "active" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsla(152,60%,44%,.15)] text-[hsl(152,60%,55%)]">Live</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-white/60">{c.owner_name || "—"}</span>
                      {c.owner_email && <p className="text-[10px] text-white/30">{c.owner_email}</p>}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3">
                     <div className="flex items-center gap-1">
                      {c.onboarding_stage !== "active" ? (
                        <button onClick={() => navigate(`/admin/clients/${c.id}/activate`)} className="p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors" title="Activate Client">
                          <Zap className="h-3.5 w-3.5 text-emerald-400 hover:text-emerald-300" />
                        </button>
                      ) : (
                        <button onClick={() => openWorkspace(c)} className="p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors" title="Open Workspace (Active)">
                          <Activity className="h-3.5 w-3.5 text-emerald-400 hover:text-emerald-300" />
                        </button>
                      )}
                      {c.owner_email && (
                        <button onClick={() => handleResendInvite(c)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors" title="Resend invite email">
                          <Mail className="h-3.5 w-3.5 text-white/40 hover:text-[hsl(var(--nl-sky))]" />
                         </button>
                       )}
                       <button
                         onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/w/${c.workspace_slug}`); toast.success("Workspace link copied!"); }}
                         className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                         title="Copy workspace link"
                       >
                         <Copy className="h-3.5 w-3.5 text-white/40 hover:text-[hsl(var(--nl-sky))]" />
                       </button>
                       <button onClick={() => handleReProvision(c)} disabled={provisioning === c.id} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors" title="Apply / Re-run Starter Template">
                         {provisioning === c.id ? <Loader2 className="h-3.5 w-3.5 text-white/40 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 text-white/40 hover:text-purple-400" />}
                       </button>
                       <button onClick={() => navigate(`/admin/clients/${c.id}/setup`)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors" title="Open master setup form">
                         <Settings className="h-3.5 w-3.5 text-white/40 hover:text-[hsl(var(--nl-neon))]" />
                       </button>
                       <button onClick={() => navigate(`/admin/clients/${c.id}/handoff`)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors" title="Handoff Checklist">
                         <CheckCircle2 className="h-3.5 w-3.5 text-white/40 hover:text-emerald-400" />
                       </button>
                       <button onClick={() => openWorkspace(c)} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors" title="Open workspace dashboard">
                         <ExternalLink className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
                       </button>
                      <button onClick={() => handleSuspend(c)} className="p-1.5 rounded-lg hover:bg-yellow-500/10 transition-colors" title={c.status === "suspended" ? "Reactivate" : "Suspend"}>
                        {c.status === "suspended" ? <Play className="h-3.5 w-3.5 text-emerald-400" /> : <Pause className="h-3.5 w-3.5 text-white/30 hover:text-yellow-400" />}
                      </button>
                      <button onClick={() => setDeleteClient({ id: c.id, business_name: c.business_name })} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" title="Delete / Archive">
                        <Trash2 className="h-3.5 w-3.5 text-white/30 hover:text-red-400" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-white/30">No clients found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <DeleteClientDialog
        open={!!deleteClient}
        onOpenChange={(open) => { if (!open) setDeleteClient(null); }}
        client={deleteClient}
        onComplete={fetchClients}
      />

    </div>
  );
}
