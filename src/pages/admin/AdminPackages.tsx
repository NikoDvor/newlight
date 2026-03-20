import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Package, Plus, Pencil, Copy, Archive, ChevronRight, Trash2,
  GripVertical, ArrowUpRight, Link2, DollarSign, Layers, Check
} from "lucide-react";

/* ─── types ─── */
interface OfferPackage {
  id: string;
  package_name: string;
  package_key: string;
  package_category: string;
  package_status: string;
  description: string | null;
  service_focus: string | null;
  pricing_model: string;
  default_setup_fee: number;
  default_monthly_fee: number;
  default_ad_spend_commitment: number | null;
  default_contract_length_months: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Deliverable {
  id: string;
  package_id: string;
  deliverable_name: string;
  deliverable_category: string;
  description: string | null;
  is_included_by_default: boolean;
  display_order: number;
}

interface PkgRelationship {
  id: string;
  source_package_id: string;
  related_package_id: string;
  relationship_type: string;
}

const CATEGORIES = ["Core Offer", "Upsell", "Downsell", "Add-On", "Internal Template"];
const FOCUSES = ["Generate Leads / Appointments", "Drive Online Sales", "Increase Local Visibility", "Full Growth System", "CRM / Automation", "Website Build", "Reviews / Reputation", "Custom"];
const PRICING_MODELS = ["Setup Plus Monthly", "Monthly Only", "Flat Fee", "Custom", "Setup Plus Monthly Plus Ad Spend"];
const STATUSES = ["Draft", "Active", "Archived"];
const DEL_CATS = ["CRM", "Calendar", "Forms", "Website", "SEO", "Ads", "Social", "Reviews", "Automation", "Reporting", "Training", "Support", "Branding", "Mobile App Experience", "Custom"];
const REL_TYPES = ["Upsell", "Downsell", "Add-On", "Bundle Candidate", "Renewal Path"];

const statusColor: Record<string, string> = {
  Active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  Draft: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  Archived: "bg-white/10 text-white/40 border-white/10",
};

export default function AdminPackages() {
  const [packages, setPackages] = useState<OfferPackage[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [relationships, setRelationships] = useState<PkgRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPkg, setEditPkg] = useState<Partial<OfferPackage> | null>(null);
  const [editDeliverables, setEditDeliverables] = useState<Partial<Deliverable>[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [relSheet, setRelSheet] = useState(false);
  const [relSource, setRelSource] = useState<string | null>(null);
  const [newRelTarget, setNewRelTarget] = useState("");
  const [newRelType, setNewRelType] = useState("Upsell");

  const load = async () => {
    setLoading(true);
    const [p, d, r] = await Promise.all([
      supabase.from("offer_packages").select("*").order("created_at", { ascending: false }),
      supabase.from("package_deliverables").select("*").order("display_order"),
      supabase.from("package_relationships").select("*"),
    ]);
    setPackages((p.data as any[]) || []);
    setDeliverables((d.data as any[]) || []);
    setRelationships((r.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditPkg({ package_name: "", package_key: "", package_category: "Core Offer", package_status: "Draft", pricing_model: "Setup Plus Monthly", default_setup_fee: 0, default_monthly_fee: 0, default_contract_length_months: 6, is_active: true, service_focus: "Custom", description: "" });
    setEditDeliverables([]);
    setSheetOpen(true);
  };

  const openEdit = (pkg: OfferPackage) => {
    setEditPkg({ ...pkg });
    setEditDeliverables(deliverables.filter(d => d.package_id === pkg.id));
    setSheetOpen(true);
  };

  const duplicate = async (pkg: OfferPackage) => {
    const { id, created_at, updated_at, ...rest } = pkg;
    const newKey = pkg.package_key + "_copy_" + Date.now().toString(36);
    const { error } = await supabase.from("offer_packages").insert({ ...rest, package_key: newKey, package_name: pkg.package_name + " (Copy)", package_status: "Draft" } as any);
    if (error) toast.error(error.message); else { toast.success("Duplicated"); load(); }
  };

  const archive = async (id: string) => {
    await supabase.from("offer_packages").update({ package_status: "Archived", is_active: false } as any).eq("id", id);
    toast.success("Archived"); load();
  };

  const savePkg = async () => {
    if (!editPkg?.package_name || !editPkg?.package_key) { toast.error("Name and key required"); return; }
    const isNew = !editPkg.id;
    let pkgId = editPkg.id;

    if (isNew) {
      const { data, error } = await supabase.from("offer_packages").insert({
        package_name: editPkg.package_name, package_key: editPkg.package_key, package_category: editPkg.package_category,
        package_status: editPkg.package_status, pricing_model: editPkg.pricing_model, default_setup_fee: editPkg.default_setup_fee,
        default_monthly_fee: editPkg.default_monthly_fee, default_ad_spend_commitment: editPkg.default_ad_spend_commitment || null,
        default_contract_length_months: editPkg.default_contract_length_months, is_active: editPkg.is_active ?? true,
        service_focus: editPkg.service_focus, description: editPkg.description,
      } as any).select("id").single();
      if (error) { toast.error(error.message); return; }
      pkgId = data?.id;
    } else {
      const { error } = await supabase.from("offer_packages").update({
        package_name: editPkg.package_name, package_key: editPkg.package_key, package_category: editPkg.package_category,
        package_status: editPkg.package_status, pricing_model: editPkg.pricing_model, default_setup_fee: editPkg.default_setup_fee,
        default_monthly_fee: editPkg.default_monthly_fee, default_ad_spend_commitment: editPkg.default_ad_spend_commitment || null,
        default_contract_length_months: editPkg.default_contract_length_months, is_active: editPkg.is_active ?? true,
        service_focus: editPkg.service_focus, description: editPkg.description,
      } as any).eq("id", editPkg.id);
      if (error) { toast.error(error.message); return; }
    }

    // Save deliverables
    if (pkgId) {
      // Delete removed
      const existing = deliverables.filter(d => d.package_id === pkgId);
      const keptIds = editDeliverables.filter(d => d.id).map(d => d.id);
      const toDelete = existing.filter(d => !keptIds.includes(d.id));
      for (const d of toDelete) await supabase.from("package_deliverables").delete().eq("id", d.id);

      // Upsert
      for (let i = 0; i < editDeliverables.length; i++) {
        const d = editDeliverables[i];
        if (d.id) {
          await supabase.from("package_deliverables").update({ deliverable_name: d.deliverable_name, deliverable_category: d.deliverable_category, description: d.description, is_included_by_default: d.is_included_by_default, display_order: i } as any).eq("id", d.id);
        } else {
          await supabase.from("package_deliverables").insert({ package_id: pkgId, deliverable_name: d.deliverable_name, deliverable_category: d.deliverable_category || "Custom", description: d.description, is_included_by_default: d.is_included_by_default ?? true, display_order: i } as any);
        }
      }
    }

    toast.success(isNew ? "Package created" : "Package updated");
    setSheetOpen(false);
    load();
  };

  const addDeliverable = () => setEditDeliverables(prev => [...prev, { deliverable_name: "", deliverable_category: "Custom", is_included_by_default: true, display_order: prev.length }]);
  const removeDeliverable = (i: number) => setEditDeliverables(prev => prev.filter((_, idx) => idx !== i));

  const addRelationship = async () => {
    if (!relSource || !newRelTarget) return;
    const { error } = await supabase.from("package_relationships").insert({ source_package_id: relSource, related_package_id: newRelTarget, relationship_type: newRelType } as any);
    if (error) toast.error(error.message); else { toast.success("Relationship added"); load(); }
    setNewRelTarget("");
  };

  const deleteRelationship = async (id: string) => {
    await supabase.from("package_relationships").delete().eq("id", id);
    toast.success("Removed"); load();
  };

  const filtered = activeTab === "all" ? packages
    : activeTab === "active" ? packages.filter(p => p.package_status === "Active")
    : activeTab === "upsells" ? packages.filter(p => ["Upsell", "Add-On", "Downsell"].includes(p.package_category))
    : packages;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Package & Offer Engine</h1>
          <p className="text-sm text-white/50 mt-1">Manage service packages, deliverables, pricing, and relationships</p>
        </div>
        <Button onClick={openCreate} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-electric))]/90 text-white gap-2">
          <Plus className="h-4 w-4" /> New Package
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/[0.06] border border-white/10">
          <TabsTrigger value="all" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10">All ({packages.length})</TabsTrigger>
          <TabsTrigger value="active" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10">Active</TabsTrigger>
          <TabsTrigger value="upsells" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10">Upsells / Add-Ons</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="text-white/40 text-center py-16">Loading packages…</div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 bg-white/[0.04] backdrop-blur-sm">
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 mx-auto text-[hsl(var(--nl-neon))]/40 mb-4" />
            <p className="text-white/70 font-medium text-lg">No packages yet</p>
            <p className="text-white/40 text-sm mt-1 mb-4 max-w-md mx-auto">Create your first service package to power proposals, billing, and activation flows.</p>
            <Button onClick={openCreate} variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-2"><Plus className="h-4 w-4" /> Create First Package</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/50 text-xs">Package</TableHead>
                <TableHead className="text-white/50 text-xs hidden md:table-cell">Category</TableHead>
                <TableHead className="text-white/50 text-xs hidden lg:table-cell">Focus</TableHead>
                <TableHead className="text-white/50 text-xs">Setup</TableHead>
                <TableHead className="text-white/50 text-xs">Monthly</TableHead>
                <TableHead className="text-white/50 text-xs">Status</TableHead>
                <TableHead className="text-white/50 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((pkg, i) => (
                <motion.tr key={pkg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-white/10 hover:bg-white/[0.04] cursor-pointer" onClick={() => navigate(`/admin/packages/${pkg.id}`)}>
                  <TableCell className="text-white font-medium text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,60%,.12)" }}>
                        <Package className="h-3.5 w-3.5 text-[hsl(var(--nl-neon))]" />
                      </div>
                      <div>
                        <span className="block">{pkg.package_name}</span>
                        <span className="text-[10px] text-white/30 font-mono">{pkg.package_key}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-white/60 text-xs hidden md:table-cell">{pkg.package_category}</TableCell>
                  <TableCell className="text-white/60 text-xs hidden lg:table-cell">{pkg.service_focus}</TableCell>
                  <TableCell className="text-white/70 text-sm font-medium">${pkg.default_setup_fee?.toLocaleString()}</TableCell>
                  <TableCell className="text-[hsl(var(--nl-sky))] text-sm font-semibold">${pkg.default_monthly_fee?.toLocaleString()}/mo</TableCell>
                  <TableCell><Badge variant="outline" className={`text-[10px] ${statusColor[pkg.package_status] || statusColor.Draft}`}>{pkg.package_status}</Badge></TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10" onClick={() => openEdit(pkg)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10" onClick={() => duplicate(pkg)}><Copy className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10" onClick={() => { setRelSource(pkg.id); setRelSheet(true); }}><Link2 className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-red-400 hover:bg-red-500/10" onClick={() => archive(pkg.id)}><Archive className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ─── Edit / Create Sheet ─── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-2xl bg-[hsl(220,35%,10%)] border-white/10 overflow-y-auto" side="right">
          <SheetHeader>
            <SheetTitle className="text-white">{editPkg?.id ? "Edit Package" : "New Package"}</SheetTitle>
          </SheetHeader>
          {editPkg && (
            <div className="space-y-5 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-white/50 mb-1 block">Package Name</label>
                  <Input value={editPkg.package_name || ""} onChange={e => setEditPkg(p => ({ ...p!, package_name: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Key (unique)</label>
                  <Input value={editPkg.package_key || ""} onChange={e => setEditPkg(p => ({ ...p!, package_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))} className="bg-white/5 border-white/10 text-white font-mono text-xs" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Status</label>
                  <Select value={editPkg.package_status} onValueChange={v => setEditPkg(p => ({ ...p!, package_status: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Category</label>
                  <Select value={editPkg.package_category} onValueChange={v => setEditPkg(p => ({ ...p!, package_category: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Service Focus</label>
                  <Select value={editPkg.service_focus || "Custom"} onValueChange={v => setEditPkg(p => ({ ...p!, service_focus: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{FOCUSES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Pricing Model</label>
                  <Select value={editPkg.pricing_model} onValueChange={v => setEditPkg(p => ({ ...p!, pricing_model: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{PRICING_MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Contract (months)</label>
                  <Input type="number" value={editPkg.default_contract_length_months ?? 6} onChange={e => setEditPkg(p => ({ ...p!, default_contract_length_months: +e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Setup Fee ($)</label>
                  <Input type="number" value={editPkg.default_setup_fee ?? 0} onChange={e => setEditPkg(p => ({ ...p!, default_setup_fee: +e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Monthly Fee ($)</label>
                  <Input type="number" value={editPkg.default_monthly_fee ?? 0} onChange={e => setEditPkg(p => ({ ...p!, default_monthly_fee: +e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Ad Spend ($)</label>
                  <Input type="number" value={editPkg.default_ad_spend_commitment ?? ""} onChange={e => setEditPkg(p => ({ ...p!, default_ad_spend_commitment: e.target.value ? +e.target.value : null }))} className="bg-white/5 border-white/10 text-white" placeholder="Optional" />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/50 mb-1 block">Description</label>
                <Textarea value={editPkg.description || ""} onChange={e => setEditPkg(p => ({ ...p!, description: e.target.value }))} className="bg-white/5 border-white/10 text-white min-h-[80px]" />
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={editPkg.is_active ?? true} onCheckedChange={v => setEditPkg(p => ({ ...p!, is_active: v }))} />
                <span className="text-xs text-white/60">Active</span>
              </div>

              {/* ─── Deliverables ─── */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Layers className="h-4 w-4 text-[hsl(var(--nl-sky))]" /> Deliverables</h3>
                  <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-1 h-7 text-xs" onClick={addDeliverable}><Plus className="h-3 w-3" /> Add</Button>
                </div>
                {editDeliverables.length === 0 && <p className="text-xs text-white/30 py-4 text-center">No deliverables yet. Add items that are included in this package.</p>}
                <div className="space-y-2">
                  {editDeliverables.map((d, i) => (
                    <div key={i} className="flex items-start gap-2 bg-white/[0.04] rounded-lg p-2.5 border border-white/5">
                      <GripVertical className="h-4 w-4 text-white/20 mt-2 shrink-0" />
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Input value={d.deliverable_name || ""} onChange={e => setEditDeliverables(prev => prev.map((x, j) => j === i ? { ...x, deliverable_name: e.target.value } : x))} placeholder="Deliverable name" className="bg-white/5 border-white/10 text-white text-xs h-8" />
                        <Select value={d.deliverable_category || "Custom"} onValueChange={v => setEditDeliverables(prev => prev.map((x, j) => j === i ? { ...x, deliverable_category: v } : x))}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{DEL_CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Switch checked={d.is_included_by_default ?? true} onCheckedChange={v => setEditDeliverables(prev => prev.map((x, j) => j === i ? { ...x, is_included_by_default: v } : x))} />
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-white/30 hover:text-red-400" onClick={() => removeDeliverable(i)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={savePkg} className="flex-1 bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-electric))]/90 text-white">Save Package</Button>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => setSheetOpen(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── Relationships Sheet ─── */}
      <Sheet open={relSheet} onOpenChange={setRelSheet}>
        <SheetContent className="sm:max-w-md bg-[hsl(220,35%,10%)] border-white/10 overflow-y-auto" side="right">
          <SheetHeader>
            <SheetTitle className="text-white">Package Relationships</SheetTitle>
          </SheetHeader>
          {relSource && (
            <div className="space-y-4 mt-4">
              <p className="text-xs text-white/50">For: <span className="text-white font-medium">{packages.find(p => p.id === relSource)?.package_name}</span></p>

              <div className="space-y-2">
                {relationships.filter(r => r.source_package_id === relSource).map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-white/[0.04] rounded-lg p-3 border border-white/5">
                    <div>
                      <Badge variant="outline" className="text-[10px] border-white/20 text-white/60 mb-1">{r.relationship_type}</Badge>
                      <p className="text-sm text-white">{packages.find(p => p.id === r.related_package_id)?.package_name || "Unknown"}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white/30 hover:text-red-400" onClick={() => deleteRelationship(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-3 space-y-2">
                <label className="text-xs text-white/50 block">Add Relationship</label>
                <Select value={newRelType} onValueChange={setNewRelType}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{REL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={newRelTarget} onValueChange={setNewRelTarget}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs"><SelectValue placeholder="Select target package" /></SelectTrigger>
                  <SelectContent>{packages.filter(p => p.id !== relSource).map(p => <SelectItem key={p.id} value={p.id}>{p.package_name}</SelectItem>)}</SelectContent>
                </Select>
                <Button onClick={addRelationship} size="sm" className="w-full bg-[hsl(var(--nl-electric))] text-white gap-1"><Plus className="h-3 w-3" /> Add</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
