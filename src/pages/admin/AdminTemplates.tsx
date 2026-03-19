import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  FileCode, Plus, Copy, Pencil, Rocket, Eye, Archive, Camera, ChevronRight,
  Package, Layers, CheckCircle2, XCircle, Clock, Loader2, Building2, Sparkles
} from "lucide-react";
import { format } from "date-fns";

const INDUSTRIES = ["Med Spa", "Salon", "Agency", "Home Service", "Professional Service", "Retail", "Custom"];
const PACKAGES = ["Generate Leads / Appointments", "Drive Online Sales", "Increase Local Visibility", "Full Growth System", "Custom"];
const COMPONENT_TYPES = [
  "Branding Defaults", "CRM Pipeline", "Calendar Setup", "Booking Forms",
  "Role Presets", "Permissions", "Automations", "Proposal Template",
  "Billing Defaults", "Training Bundle", "Dashboard Layout",
  "Website Module Defaults", "SEO Defaults", "Ads Defaults",
  "Social Defaults", "Review Settings", "Integration Defaults"
];
const SNAPSHOT_TYPES = ["Workspace Snapshot", "Calendar Snapshot", "Forms Snapshot", "CRM Snapshot", "Automation Snapshot", "Full System Snapshot"];
const SNAPSHOT_SCOPES = ["Internal Only", "Reusable", "Industry Specific", "Client Derived"];

type Template = { id: string; template_name: string; template_key: string; industry_type: string; service_package_type: string; description: string | null; is_active: boolean; created_at: string; updated_at: string };
type Component = { id: string; template_id: string; component_type: string; component_key: string; component_config: any; component_order: number; is_active: boolean };
type Deployment = { id: string; template_id: string | null; workspace_id: string | null; deployed_by: string | null; deployment_status: string; deployed_at: string | null; created_at: string; template?: Template; workspace_name?: string };
type Snapshot = { id: string; snapshot_name: string; snapshot_key: string; source_workspace_id: string | null; source_template_id: string | null; snapshot_type: string; snapshot_scope: string; snapshot_payload: any; is_active: boolean; created_at: string; updated_at: string };

export default function AdminTemplates() {
  const [tab, setTab] = useState("templates");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"template" | "snapshot" | "preview" | "deploy">("template");
  const [editing, setEditing] = useState<Template | Snapshot | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [workspaces, setWorkspaces] = useState<{ id: string; business_name: string }[]>([]);
  const [deployTarget, setDeployTarget] = useState({ template_id: "", workspace_id: "" });
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({ name: "", key: "", industry: "Custom", package: "Custom", description: "", is_active: true });
  const [snapForm, setSnapForm] = useState({ name: "", key: "", type: "Full System Snapshot", scope: "Internal Only", source_workspace_id: "", source_template_id: "", is_active: true });

  const load = useCallback(async () => {
    setLoading(true);
    const [tRes, sRes, dRes, wRes] = await Promise.all([
      supabase.from("workspace_templates" as any).select("*").order("updated_at", { ascending: false }),
      supabase.from("snapshot_records" as any).select("*").order("updated_at", { ascending: false }),
      supabase.from("template_deployments" as any).select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("clients").select("id, business_name").order("business_name"),
    ]);
    setTemplates((tRes.data as any as Template[]) || []);
    setSnapshots((sRes.data as any as Snapshot[]) || []);
    setDeployments((dRes.data as any as Deployment[]) || []);
    setWorkspaces((wRes.data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadComponents = async (templateId: string) => {
    const { data } = await supabase.from("template_components").select("*").eq("template_id", templateId).order("component_order");
    setComponents((data as Component[]) || []);
  };

  const openCreate = (mode: "template" | "snapshot") => {
    setSheetMode(mode);
    setEditing(null);
    setForm({ name: "", key: "", industry: "Custom", package: "Custom", description: "", is_active: true });
    setSnapForm({ name: "", key: "", type: "Full System Snapshot", scope: "Internal Only", source_workspace_id: "", source_template_id: "", is_active: true });
    setSheetOpen(true);
  };

  const openEdit = (item: Template | Snapshot, mode: "template" | "snapshot") => {
    setSheetMode(mode);
    setEditing(item);
    if (mode === "template") {
      const t = item as Template;
      setForm({ name: t.template_name, key: t.template_key, industry: t.industry_type, package: t.service_package_type, description: t.description || "", is_active: t.is_active });
    } else {
      const s = item as Snapshot;
      setSnapForm({ name: s.snapshot_name, key: s.snapshot_key, type: s.snapshot_type, scope: s.snapshot_scope, source_workspace_id: s.source_workspace_id || "", source_template_id: s.source_template_id || "", is_active: s.is_active });
    }
    setSheetOpen(true);
  };

  const openPreview = async (t: Template) => {
    setPreviewTemplate(t);
    await loadComponents(t.id);
    setSheetMode("preview");
    setSheetOpen(true);
  };

  const openDeploy = (t: Template) => {
    setDeployTarget({ template_id: t.id, workspace_id: "" });
    setSheetMode("deploy");
    setSheetOpen(true);
  };

  const saveTemplate = async () => {
    setSaving(true);
    const payload = { template_name: form.name, template_key: form.key, industry_type: form.industry, service_package_type: form.package, description: form.description || null, is_active: form.is_active };
    if (editing) {
      const { error } = await supabase.from("workspace_templates").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); } else { toast.success("Template updated"); }
    } else {
      const { error } = await supabase.from("workspace_templates").insert(payload);
      if (error) { toast.error(error.message); } else { toast.success("Template created"); }
    }
    setSaving(false);
    setSheetOpen(false);
    load();
  };

  const saveSnapshot = async () => {
    setSaving(true);
    const payload = { snapshot_name: snapForm.name, snapshot_key: snapForm.key, snapshot_type: snapForm.type, snapshot_scope: snapForm.scope, source_workspace_id: snapForm.source_workspace_id || null, source_template_id: snapForm.source_template_id || null, is_active: snapForm.is_active, snapshot_payload: {} };
    if (editing) {
      const { error } = await supabase.from("snapshot_records").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); } else { toast.success("Snapshot updated"); }
    } else {
      const { error } = await supabase.from("snapshot_records").insert(payload);
      if (error) { toast.error(error.message); } else { toast.success("Snapshot created"); }
    }
    setSaving(false);
    setSheetOpen(false);
    load();
  };

  const duplicateTemplate = async (t: Template) => {
    const { error } = await supabase.from("workspace_templates").insert({
      template_name: `${t.template_name} (Copy)`,
      template_key: `${t.template_key}_copy_${Date.now()}`,
      industry_type: t.industry_type,
      service_package_type: t.service_package_type,
      description: t.description,
      is_active: false,
    });
    if (error) toast.error(error.message); else { toast.success("Template duplicated"); load(); }
  };

  const toggleActive = async (table: string, id: string, val: boolean) => {
    const { error } = await (supabase.from(table as any) as any).update({ is_active: val }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const deployTemplate = async () => {
    if (!deployTarget.template_id || !deployTarget.workspace_id) { toast.error("Select a workspace"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("template_deployments").insert({
      template_id: deployTarget.template_id,
      workspace_id: deployTarget.workspace_id,
      deployed_by: user?.id,
      deployment_status: "Completed",
      deployed_at: new Date().toISOString(),
    });
    if (error) { toast.error(error.message); } else {
      toast.success("Template deployed to workspace");
      // Log audit
      await supabase.from("audit_logs").insert({ action: "template_deployed", module: "templates", metadata: { template_id: deployTarget.template_id, workspace_id: deployTarget.workspace_id }, user_id: user?.id });
    }
    setSaving(false);
    setSheetOpen(false);
    load();
  };

  const addComponent = async (templateId: string, type: string) => {
    const { error } = await supabase.from("template_components").insert({
      template_id: templateId,
      component_type: type,
      component_key: type.toLowerCase().replace(/\s+/g, "_"),
      component_config: {},
      component_order: components.length,
    });
    if (error) toast.error(error.message); else { toast.success("Component added"); loadComponents(templateId); }
  };

  const removeComponent = async (id: string, templateId: string) => {
    await supabase.from("template_components").delete().eq("id", id);
    loadComponents(templateId);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { Completed: "bg-emerald-500/20 text-emerald-400", Pending: "bg-amber-500/20 text-amber-400", "In Progress": "bg-blue-500/20 text-blue-400", Failed: "bg-red-500/20 text-red-400" };
    return <Badge className={`${map[status] || "bg-white/10 text-white/60"} border-0 text-[10px]`}>{status}</Badge>;
  };

  const industryIcon = (industry: string) => {
    return <Building2 className="h-3.5 w-3.5" />;
  };

  if (loading) return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--nl-neon))]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Templates & Snapshots</h1>
          <p className="text-sm text-white/50 mt-1">Reusable niche templates for rapid workspace deployment</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white/[0.04] border border-white/[0.06]">
          <TabsTrigger value="templates" className="data-[state=active]:bg-white/10 text-white/60 data-[state=active]:text-white text-xs">Templates</TabsTrigger>
          <TabsTrigger value="snapshots" className="data-[state=active]:bg-white/10 text-white/60 data-[state=active]:text-white text-xs">Snapshots</TabsTrigger>
          <TabsTrigger value="deployments" className="data-[state=active]:bg-white/10 text-white/60 data-[state=active]:text-white text-xs">Deployments</TabsTrigger>
        </TabsList>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => openCreate("template")} className="bg-[hsl(var(--nl-neon))] hover:bg-[hsl(var(--nl-neon))]/90 text-white gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create Template
            </Button>
          </div>
          {templates.length === 0 ? (
            <EmptyState title="No Templates Yet" desc="Create reusable industry templates to speed up workspace deployment." action={() => openCreate("template")} actionLabel="Create First Template" icon={<FileCode className="h-8 w-8 text-[hsl(var(--nl-neon))]" />} />
          ) : (
            <Card className="border-0 bg-white/[0.03] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/50 text-xs">Template</TableHead>
                    <TableHead className="text-white/50 text-xs">Industry</TableHead>
                    <TableHead className="text-white/50 text-xs">Package</TableHead>
                    <TableHead className="text-white/50 text-xs">Active</TableHead>
                    <TableHead className="text-white/50 text-xs">Updated</TableHead>
                    <TableHead className="text-white/50 text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id} className="border-white/[0.04] hover:bg-white/[0.03]">
                      <TableCell className="text-white text-sm font-medium">{t.template_name}</TableCell>
                      <TableCell><Badge variant="outline" className="border-white/10 text-white/60 text-[10px] gap-1">{industryIcon(t.industry_type)} {t.industry_type}</Badge></TableCell>
                      <TableCell className="text-white/50 text-xs">{t.service_package_type}</TableCell>
                      <TableCell><Switch checked={t.is_active} onCheckedChange={(v) => toggleActive("workspace_templates", t.id, v)} /></TableCell>
                      <TableCell className="text-white/40 text-xs">{format(new Date(t.updated_at), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => openPreview(t)}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => openEdit(t, "template")}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => duplicateTemplate(t)}><Copy className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-[hsl(var(--nl-neon))]" onClick={() => openDeploy(t)}><Rocket className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* SNAPSHOTS TAB */}
        <TabsContent value="snapshots" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => openCreate("snapshot")} className="bg-[hsl(var(--nl-neon))] hover:bg-[hsl(var(--nl-neon))]/90 text-white gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create Snapshot
            </Button>
          </div>
          {snapshots.length === 0 ? (
            <EmptyState title="No Snapshots Yet" desc="Capture working configurations from templates or live workspaces for reuse." action={() => openCreate("snapshot")} actionLabel="Create First Snapshot" icon={<Camera className="h-8 w-8 text-[hsl(var(--nl-neon))]" />} />
          ) : (
            <Card className="border-0 bg-white/[0.03] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/50 text-xs">Snapshot</TableHead>
                    <TableHead className="text-white/50 text-xs">Type</TableHead>
                    <TableHead className="text-white/50 text-xs">Scope</TableHead>
                    <TableHead className="text-white/50 text-xs">Active</TableHead>
                    <TableHead className="text-white/50 text-xs">Updated</TableHead>
                    <TableHead className="text-white/50 text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((s) => (
                    <TableRow key={s.id} className="border-white/[0.04] hover:bg-white/[0.03]">
                      <TableCell className="text-white text-sm font-medium">{s.snapshot_name}</TableCell>
                      <TableCell className="text-white/50 text-xs">{s.snapshot_type}</TableCell>
                      <TableCell><Badge variant="outline" className="border-white/10 text-white/60 text-[10px]">{s.snapshot_scope}</Badge></TableCell>
                      <TableCell><Switch checked={s.is_active} onCheckedChange={(v) => toggleActive("snapshot_records", s.id, v)} /></TableCell>
                      <TableCell className="text-white/40 text-xs">{format(new Date(s.updated_at), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-white" onClick={() => openEdit(s, "snapshot")}><Pencil className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* DEPLOYMENTS TAB */}
        <TabsContent value="deployments" className="space-y-4 mt-4">
          {deployments.length === 0 ? (
            <EmptyState title="No Deployments Yet" desc="Deploy a template to a workspace to see deployment history here." icon={<Rocket className="h-8 w-8 text-[hsl(var(--nl-neon))]" />} />
          ) : (
            <Card className="border-0 bg-white/[0.03] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/50 text-xs">Template</TableHead>
                    <TableHead className="text-white/50 text-xs">Workspace</TableHead>
                    <TableHead className="text-white/50 text-xs">Status</TableHead>
                    <TableHead className="text-white/50 text-xs">Deployed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deployments.map((d) => {
                    const tpl = templates.find((t) => t.id === d.template_id);
                    const ws = workspaces.find((w) => w.id === d.workspace_id);
                    return (
                      <TableRow key={d.id} className="border-white/[0.04] hover:bg-white/[0.03]">
                        <TableCell className="text-white text-sm">{tpl?.template_name || "—"}</TableCell>
                        <TableCell className="text-white/60 text-sm">{ws?.business_name || d.workspace_id || "—"}</TableCell>
                        <TableCell>{statusBadge(d.deployment_status)}</TableCell>
                        <TableCell className="text-white/40 text-xs">{d.deployed_at ? format(new Date(d.deployed_at), "MMM d, yyyy h:mm a") : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* SHEET */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="bg-[hsl(220,35%,10%)] border-white/[0.06] text-white w-full sm:max-w-lg overflow-y-auto">
          {sheetMode === "template" && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">{editing ? "Edit Template" : "Create Template"}</SheetTitle>
                <SheetDescription className="text-white/50">Define a reusable workspace template for rapid deployment.</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div><Label className="text-white/70 text-xs">Template Name</Label><Input className="bg-white/[0.06] border-white/10 text-white mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label className="text-white/70 text-xs">Template Key</Label><Input className="bg-white/[0.06] border-white/10 text-white mt-1" placeholder="e.g. med_spa_starter" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} /></div>
                <div><Label className="text-white/70 text-xs">Industry</Label>
                  <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                    <SelectTrigger className="bg-white/[0.06] border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-white/70 text-xs">Service Package</Label>
                  <Select value={form.package} onValueChange={(v) => setForm({ ...form, package: v })}>
                    <SelectTrigger className="bg-white/[0.06] border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{PACKAGES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-white/70 text-xs">Description</Label><Textarea className="bg-white/[0.06] border-white/10 text-white mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label className="text-white/70 text-xs">Active</Label>
                </div>
                <Button className="w-full bg-[hsl(var(--nl-neon))] hover:bg-[hsl(var(--nl-neon))]/90 text-white" onClick={saveTemplate} disabled={saving || !form.name || !form.key}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editing ? "Update Template" : "Create Template"}
                </Button>
              </div>
            </>
          )}

          {sheetMode === "snapshot" && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">{editing ? "Edit Snapshot" : "Create Snapshot"}</SheetTitle>
                <SheetDescription className="text-white/50">Capture a configuration snapshot for reuse.</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div><Label className="text-white/70 text-xs">Snapshot Name</Label><Input className="bg-white/[0.06] border-white/10 text-white mt-1" value={snapForm.name} onChange={(e) => setSnapForm({ ...snapForm, name: e.target.value })} /></div>
                <div><Label className="text-white/70 text-xs">Snapshot Key</Label><Input className="bg-white/[0.06] border-white/10 text-white mt-1" value={snapForm.key} onChange={(e) => setSnapForm({ ...snapForm, key: e.target.value })} /></div>
                <div><Label className="text-white/70 text-xs">Type</Label>
                  <Select value={snapForm.type} onValueChange={(v) => setSnapForm({ ...snapForm, type: v })}>
                    <SelectTrigger className="bg-white/[0.06] border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{SNAPSHOT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-white/70 text-xs">Scope</Label>
                  <Select value={snapForm.scope} onValueChange={(v) => setSnapForm({ ...snapForm, scope: v })}>
                    <SelectTrigger className="bg-white/[0.06] border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{SNAPSHOT_SCOPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-white/70 text-xs">Source Workspace (optional)</Label>
                  <Select value={snapForm.source_workspace_id} onValueChange={(v) => setSnapForm({ ...snapForm, source_workspace_id: v })}>
                    <SelectTrigger className="bg-white/[0.06] border-white/10 text-white mt-1"><SelectValue placeholder="Select workspace" /></SelectTrigger>
                    <SelectContent>{workspaces.map((w) => <SelectItem key={w.id} value={w.id}>{w.business_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={snapForm.is_active} onCheckedChange={(v) => setSnapForm({ ...snapForm, is_active: v })} />
                  <Label className="text-white/70 text-xs">Active</Label>
                </div>
                <Button className="w-full bg-[hsl(var(--nl-neon))] hover:bg-[hsl(var(--nl-neon))]/90 text-white" onClick={saveSnapshot} disabled={saving || !snapForm.name || !snapForm.key}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editing ? "Update Snapshot" : "Create Snapshot"}
                </Button>
              </div>
            </>
          )}

          {sheetMode === "preview" && previewTemplate && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">{previewTemplate.template_name}</SheetTitle>
                <SheetDescription className="text-white/50">{previewTemplate.industry_type} · {previewTemplate.service_package_type}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                {previewTemplate.description && <p className="text-white/60 text-sm">{previewTemplate.description}</p>}
                <div className="flex items-center justify-between">
                  <h3 className="text-white text-sm font-semibold">Components</h3>
                  <Select onValueChange={(v) => addComponent(previewTemplate.id, v)}>
                    <SelectTrigger className="w-auto bg-white/[0.06] border-white/10 text-white text-xs h-7 px-2"><Plus className="h-3 w-3 mr-1" /><span>Add</span></SelectTrigger>
                    <SelectContent>{COMPONENT_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {components.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
                    <Layers className="h-6 w-6 text-white/20 mx-auto mb-2" />
                    <p className="text-white/40 text-xs">No components yet. Add components to define what this template deploys.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {components.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Package className="h-3.5 w-3.5 text-[hsl(var(--nl-neon))]" />
                          <span className="text-white text-xs font-medium">{c.component_type}</span>
                        </div>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-white/30 hover:text-red-400" onClick={() => removeComponent(c.id, previewTemplate.id)}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button className="w-full bg-[hsl(var(--nl-neon))] hover:bg-[hsl(var(--nl-neon))]/90 text-white gap-1.5 mt-4" onClick={() => { setSheetOpen(false); openDeploy(previewTemplate); }}>
                  <Rocket className="h-3.5 w-3.5" /> Deploy Template
                </Button>
              </div>
            </>
          )}

          {sheetMode === "deploy" && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">Deploy Template</SheetTitle>
                <SheetDescription className="text-white/50">Apply this template to a client workspace.</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div><Label className="text-white/70 text-xs">Template</Label>
                  <Input className="bg-white/[0.06] border-white/10 text-white/60 mt-1" readOnly value={templates.find((t) => t.id === deployTarget.template_id)?.template_name || ""} />
                </div>
                <div><Label className="text-white/70 text-xs">Target Workspace</Label>
                  <Select value={deployTarget.workspace_id} onValueChange={(v) => setDeployTarget({ ...deployTarget, workspace_id: v })}>
                    <SelectTrigger className="bg-white/[0.06] border-white/10 text-white mt-1"><SelectValue placeholder="Select workspace" /></SelectTrigger>
                    <SelectContent>{workspaces.map((w) => <SelectItem key={w.id} value={w.id}>{w.business_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button className="w-full bg-[hsl(var(--nl-neon))] hover:bg-[hsl(var(--nl-neon))]/90 text-white gap-1.5" onClick={deployTemplate} disabled={saving || !deployTarget.workspace_id}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-3.5 w-3.5" />} Deploy Now
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EmptyState({ title, desc, action, actionLabel, icon }: { title: string; desc: string; action?: () => void; actionLabel?: string; icon: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-dashed border-white/10 bg-white/[0.02]">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "hsla(211,96%,60%,.1)" }}>
            {icon}
          </div>
          <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
          <p className="text-white/40 text-sm max-w-sm mb-6">{desc}</p>
          {action && actionLabel && (
            <Button onClick={action} className="bg-[hsl(var(--nl-neon))] hover:bg-[hsl(var(--nl-neon))]/90 text-white gap-1.5">
              <Plus className="h-3.5 w-3.5" /> {actionLabel}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
