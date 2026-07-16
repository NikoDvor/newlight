import { useEffect, useMemo, useState } from "react";
import { TestimonialFormDialog } from "@/components/TestimonialFormDialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, FileText, Plus, Search, ShieldAlert } from "lucide-react";
import { emitEvent } from "@/lib/automationEngine";

type Status =
  | "draft" | "submitted" | "in_review" | "changes_requested"
  | "approved" | "published" | "archived";

type MaterialType = "email" | "social_post" | "ad" | "landing_page" | "video" | "print" | "other";

interface Material {
  id: string;
  client_id: string;
  title: string;
  material_type: MaterialType;
  status: Status;
  has_testimonial: boolean;
  content_url: string | null;
  content_text: string | null;
  current_version_id: string | null;
  compliance_flags: Array<{ phrase: string; category: string }> | null;
  created_at: string;
  updated_at: string;
}

interface Version {
  id: string;
  material_id: string;
  version_number: number;
  content_snapshot: any;
  disclosure_ids: string[];
  submitted_by: string | null;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  status: Status;
}

interface Disclosure {
  id: string;
  client_id: string;
  disclosure_text: string;
  disclosure_type: "testimonial" | "compensation" | "conflict_of_interest" | "general";
  is_required: boolean;
}

interface SubFile {
  id: string;
  material_id: string;
  claim_text: string;
  file_url: string | null;
  uploaded_at: string;
}

const STATUS_META: Record<Status, { label: string; color: string; icon: any }> = {
  draft:              { label: "Draft",             color: "bg-slate-500/15 text-slate-300 border-slate-500/30",     icon: FileText },
  submitted:          { label: "Submitted",         color: "bg-blue-500/15 text-blue-300 border-blue-500/30",        icon: Clock },
  in_review:          { label: "In Review",         color: "bg-amber-500/15 text-amber-300 border-amber-500/30",     icon: Clock },
  changes_requested:  { label: "Changes Requested", color: "bg-orange-500/15 text-orange-300 border-orange-500/30",  icon: AlertTriangle },
  approved:           { label: "Approved",          color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  published:          { label: "Published",         color: "bg-green-500/15 text-green-300 border-green-500/30",     icon: CheckCircle2 },
  archived:           { label: "Archived",          color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",         icon: FileText },
};

const KPI_STATUSES: Status[] = ["draft", "submitted", "in_review", "changes_requested", "approved"];

const MATERIAL_TYPES: { value: MaterialType; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "social_post", label: "Social Post" },
  { value: "ad", label: "Ad" },
  { value: "landing_page", label: "Landing Page" },
  { value: "video", label: "Video" },
  { value: "print", label: "Print" },
  { value: "other", label: "Other" },
];

export default function AdminMarketingReview() {
  const { user, activeClientId, isAdmin, userRole } = useWorkspace();
  const canReview = isAdmin || userRole === "marketing_staff";

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Material | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [subFiles, setSubFiles] = useState<SubFile[]>([]);
  const [reviewNotes, setReviewNotes] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({
    title: "", material_type: "other" as MaterialType, content_text: "", content_url: "",
    has_testimonial: false,
  });
  const [linkedDisclosureIds, setLinkedDisclosureIds] = useState<string[]>([]);
  const [savingLinks, setSavingLinks] = useState(false);
  const [showTestimonialDialog, setShowTestimonialDialog] = useState(false);

  const currentVersion = versions[0] ?? null;

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketing_materials")
      .select("*")
      .order("updated_at", { ascending: false });
    setMaterials((data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [activeClientId]);

  const openMaterial = async (m: Material) => {
    setSelected(m);
    setReviewNotes("");
    const [{ data: v }, { data: d }, { data: f }] = await Promise.all([
      supabase.from("marketing_material_versions").select("*").eq("material_id", m.id).order("version_number", { ascending: false }),
      supabase.from("marketing_disclosures").select("*").eq("client_id", m.client_id),
      supabase.from("marketing_substantiation_files").select("*").eq("material_id", m.id),
    ]);
    const versionRows = (v as any[]) ?? [];
    setVersions(versionRows);
    setDisclosures((d as any[]) ?? []);
    setSubFiles((f as any[]) ?? []);
    setLinkedDisclosureIds(
      (versionRows[0]?.disclosure_ids as string[] | null) ?? []
    );

    // Auto-flip submitted -> in_review when reviewer opens
    if (canReview && m.status === "submitted") {
      await updateStatus(m, "in_review");
    }
  };

  const saveLinkedDisclosures = async () => {
    if (!currentVersion) {
      toast.error("Submit the material first — no version exists to attach disclosures to.");
      return;
    }
    setSavingLinks(true);
    const { error } = await supabase
      .from("marketing_material_versions")
      .update({ disclosure_ids: linkedDisclosureIds } as any)
      .eq("id", currentVersion.id);
    setSavingLinks(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Disclosures linked to this version");
    if (selected) openMaterial(selected);
  };

  const writeAudit = async (m: Material, oldStatus: Status, newStatus: Status) => {
    await supabase.from("audit_logs").insert({
      action: `marketing_review_${newStatus}`,
      module: "marketing_review",
      client_id: m.client_id,
      metadata: {
        material_id: m.id, title: m.title,
        old_status: oldStatus, new_status: newStatus,
      },
    } as any);
  };

  const updateStatus = async (m: Material, next: Status, notes?: string) => {
    const old = m.status;

    // 1. Insert new immutable version FIRST + point current_version_id at it,
    //    so the DB-level approval trigger sees the correctly-linked disclosures.
    let newVersionId: string | null = null;
    if (["submitted", "approved", "changes_requested"].includes(next)) {
      const nextVersion = (versions[0]?.version_number ?? 0) + 1;
      // Carry forward the disclosures the reviewer just linked (or existing ones).
      const carriedDisclosureIds =
        linkedDisclosureIds.length > 0
          ? linkedDisclosureIds
          : (versions[0]?.disclosure_ids as string[] | null) ?? [];
      const { data: vRow, error: vErr } = await supabase
        .from("marketing_material_versions")
        .insert({
          material_id: m.id,
          client_id: m.client_id,
          version_number: nextVersion,
          content_snapshot: {
            title: m.title, material_type: m.material_type,
            content_text: m.content_text, content_url: m.content_url,
            has_testimonial: m.has_testimonial,
          },
          disclosure_ids: carriedDisclosureIds,
          submitted_by: user?.id ?? null,
          reviewed_by: canReview ? user?.id ?? null : null,
          reviewed_at: canReview ? new Date().toISOString() : null,
          review_notes: notes ?? null,
          status: next,
        } as any)
        .select("*")
        .single();
      if (vErr) { toast.error(vErr.message); return; }
      newVersionId = (vRow as any).id;
      const { error: cvErr } = await supabase.from("marketing_materials")
        .update({ current_version_id: newVersionId } as any).eq("id", m.id);
      if (cvErr) { toast.error(cvErr.message); return; }
    }

    // 2. Now flip the status. The BEFORE UPDATE trigger will re-check disclosures.
    const { error } = await supabase
      .from("marketing_materials")
      .update({ status: next } as any)
      .eq("id", m.id);
    if (error) { toast.error(error.message); return; }

    await writeAudit(m, old, next);

    const eventMap: Partial<Record<Status, string>> = {
      submitted: "material_submitted",
      approved: "material_approved",
      changes_requested: "material_changes_requested",
    };
    const evt = eventMap[next];
    if (evt) {
      await emitEvent({
        eventKey: evt as any,
        clientId: m.client_id,
        relatedType: "marketing_material",
        relatedId: m.id,
        payload: { title: m.title, status: next },
      });
    }

    toast.success(`Status → ${STATUS_META[next].label}`);
    await load();
    if (selected?.id === m.id) {
      setSelected({ ...m, status: next });
      openMaterial({ ...m, status: next });
    }
  };

  const requiredDisclosureMissing = useMemo(() => {
    if (!selected?.has_testimonial) return false;
    const linkedIds = currentVersion?.disclosure_ids ?? [];
    if (!linkedIds || linkedIds.length === 0) return true;
    return !disclosures.some(
      (d) => d.disclosure_type === "testimonial" && linkedIds.includes(d.id)
    );
  }, [selected, disclosures, currentVersion]);

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [materials, search, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of KPI_STATUSES) c[s] = 0;
    materials.forEach((m) => { c[m.status] = (c[m.status] ?? 0) + 1; });
    return c;
  }, [materials]);

  const createDraft = async () => {
    if (!activeClientId) { toast.error("No client selected"); return; }
    if (!newForm.title.trim()) { toast.error("Title required"); return; }
    const { data, error } = await supabase
      .from("marketing_materials")
      .insert({
        client_id: activeClientId,
        title: newForm.title,
        material_type: newForm.material_type,
        content_text: newForm.content_text || null,
        content_url: newForm.content_url || null,
        has_testimonial: newForm.has_testimonial,
        created_by: user?.id ?? null,
        status: "draft",
      } as any)
      .select("*")
      .single();
    if (error) { toast.error(error.message); return; }
    toast.success("Draft created");
    setShowNew(false);
    setNewForm({ title: "", material_type: "other", content_text: "", content_url: "", has_testimonial: false });
    await load();
    if (data) openMaterial(data as any);
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Marketing Review & Approval"
        description="Route marketing materials through disclosure-checked compliance review before publish."
      >
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Material</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Marketing Material</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={newForm.title} onChange={(e) => setNewForm({ ...newForm, title: e.target.value })} />
              </div>
              <div>
                <Label>Material Type</Label>
                <Select value={newForm.material_type} onValueChange={(v) => setNewForm({ ...newForm, material_type: v as MaterialType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MATERIAL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Content URL (optional)</Label>
                <Input value={newForm.content_url} onChange={(e) => setNewForm({ ...newForm, content_url: e.target.value })} placeholder="https://…" />
              </div>
              <div>
                <Label>Content / Copy</Label>
                <Textarea rows={5} value={newForm.content_text} onChange={(e) => setNewForm({ ...newForm, content_text: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={newForm.has_testimonial} onCheckedChange={(c) => setNewForm({ ...newForm, has_testimonial: !!c })} />
                Contains testimonial / endorsement
              </label>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button onClick={createDraft}>Create Draft</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {KPI_STATUSES.map((s) => {
          const meta = STATUS_META[s];
          const Icon = meta.icon;
          return (
            <Card key={s} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">{meta.label}</div>
                    <div className="text-2xl font-bold text-foreground mt-1">{counts[s] ?? 0}</div>
                  </div>
                  <Icon className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search materials…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Testimonial</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No materials yet. Create one to start.</TableCell></TableRow>
              ) : filtered.map((m) => {
                const meta = STATUS_META[m.status];
                return (
                  <TableRow key={m.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openMaterial(m)}>
                    <TableCell className="font-medium">{m.title}</TableCell>
                    <TableCell className="text-muted-foreground">{MATERIAL_TYPES.find((t) => t.value === m.material_type)?.label}</TableCell>
                    <TableCell><Badge variant="outline" className={meta.color}>{meta.label}</Badge></TableCell>
                    <TableCell>{m.has_testimonial ? <Badge variant="outline" className="bg-purple-500/15 text-purple-300 border-purple-500/30">Yes</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(m.updated_at).toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>
                  <Badge variant="outline" className={STATUS_META[selected.status].color}>
                    {STATUS_META[selected.status].label}
                  </Badge>
                  <span className="ml-2 text-xs">v{versions[0]?.version_number ?? 0}</span>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Content */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Content</h3>
                  {selected.content_url && (
                    <a href={selected.content_url} target="_blank" rel="noreferrer"
                       className="text-primary text-sm underline block mb-2">{selected.content_url}</a>
                  )}
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 border border-border rounded-md p-3 max-h-60 overflow-y-auto">
                    {selected.content_text || <span className="italic">No text content</span>}
                  </div>
                </section>

                {/* Disclosure gate */}
                {selected.has_testimonial && (
                  <section className={`rounded-md border p-3 ${requiredDisclosureMissing ? "border-red-500/40 bg-red-500/10" : "border-emerald-500/30 bg-emerald-500/10"}`}>
                    <div className="flex items-center justify-between gap-2 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className={`h-4 w-4 ${requiredDisclosureMissing ? "text-red-400" : "text-emerald-400"}`} />
                        {requiredDisclosureMissing
                          ? "Testimonial detected — testimonial disclosure required before approval."
                          : "Testimonial disclosure on file."}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setShowTestimonialDialog(true)}>
                        Add Testimonial Record
                      </Button>
                    </div>
                  </section>
                )}

                {/* Compliance flags (risky claim keyword scan) */}
                {Array.isArray(selected.compliance_flags) && selected.compliance_flags.length > 0 && (
                  <section className="rounded-md border p-3 border-amber-500/40 bg-amber-500/10">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-200 mb-2">
                      <ShieldAlert className="h-4 w-4 text-amber-400" />
                      Compliance Flags — {selected.compliance_flags.length} risky phrase{selected.compliance_flags.length === 1 ? "" : "s"} detected
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.compliance_flags.map((f, i) => (
                        <Badge key={i} variant="outline" className="bg-amber-500/15 text-amber-200 border-amber-500/40 text-[11px]">
                          "{f.phrase}"
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-amber-200/80 mt-2">
                      Auto-flagged for reviewer attention. Not a hard block — verify substantiation before approving.
                    </div>
                  </section>
                )}

                <TestimonialFormDialog
                  open={showTestimonialDialog}
                  onOpenChange={setShowTestimonialDialog}
                  materialId={selected.id}
                  onSaved={() => openMaterial(selected)}
                />


                {/* Version history */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Version History</h3>
                  <div className="space-y-2">
                    {versions.length === 0 && <div className="text-xs text-muted-foreground">No versions submitted yet.</div>}
                    {versions.map((v) => (
                      <div key={v.id} className="rounded-md border border-border bg-muted/20 p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">v{v.version_number}</span>
                          <Badge variant="outline" className={STATUS_META[v.status].color}>{STATUS_META[v.status].label}</Badge>
                        </div>
                        <div className="text-muted-foreground mt-1">
                          {new Date(v.submitted_at).toLocaleString()}
                          {v.review_notes && <div className="italic mt-1">"{v.review_notes}"</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Disclosures — attach to the CURRENT version */}
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      Link Disclosures to This Version
                      {currentVersion && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          (v{currentVersion.version_number} · {linkedDisclosureIds.length} linked)
                        </span>
                      )}
                    </h3>
                    {currentVersion && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={savingLinks}
                        onClick={saveLinkedDisclosures}
                      >
                        {savingLinks ? "Saving…" : "Save Links"}
                      </Button>
                    )}
                  </div>
                  {!currentVersion && (
                    <div className="text-xs text-muted-foreground mb-2">
                      Submit this material for review to create a version you can attach disclosures to.
                    </div>
                  )}
                  {disclosures.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No disclosures on file for this client — add one under Compliance Disclosures first.</div>
                  ) : (
                    <div className="space-y-1">
                      {disclosures.map((d) => {
                        const checked = linkedDisclosureIds.includes(d.id);
                        return (
                          <label
                            key={d.id}
                            className="flex items-start gap-2 text-xs rounded-md border border-border bg-muted/20 p-2 cursor-pointer hover:bg-muted/40"
                          >
                            <Checkbox
                              checked={checked}
                              disabled={!currentVersion}
                              onCheckedChange={(c) => {
                                setLinkedDisclosureIds((prev) =>
                                  c ? [...prev, d.id] : prev.filter((x) => x !== d.id)
                                );
                              }}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <Badge variant="outline" className="text-[10px] mr-2">{d.disclosure_type}</Badge>
                              {d.disclosure_text}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>


                {/* Substantiation */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Substantiation Files ({subFiles.length})</h3>
                  {subFiles.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No substantiation on file.</div>
                  ) : (
                    <div className="space-y-1">
                      {subFiles.map((f) => (
                        <div key={f.id} className="text-xs rounded-md border border-border bg-muted/20 p-2">
                          <div className="font-medium">{f.claim_text}</div>
                          {f.file_url && <a href={f.file_url} target="_blank" rel="noreferrer" className="text-primary underline">View file</a>}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Actions */}
                {canReview ? (
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Review Actions</h3>
                    <Textarea
                      placeholder="Review notes (required for Request Changes)…"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={3}
                    />
                    {requiredDisclosureMissing && (
                      <div className="text-xs text-red-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Approve is blocked — add a testimonial disclosure for this client first.
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {selected.status === "draft" && (
                        <Button onClick={() => updateStatus(selected, "submitted")}>Submit for Review</Button>
                      )}
                      <Button
                        variant="outline"
                        disabled={!reviewNotes.trim()}
                        onClick={() => updateStatus(selected, "changes_requested", reviewNotes)}
                      >Request Changes</Button>
                      <Button
                        disabled={requiredDisclosureMissing}
                        onClick={() => updateStatus(selected, "approved", reviewNotes || undefined)}
                      >Approve</Button>
                      <Button
                        variant="destructive"
                        disabled={!reviewNotes.trim()}
                        onClick={() => updateStatus(selected, "archived", reviewNotes)}
                      >Reject</Button>
                    </div>
                  </section>
                ) : (
                  selected.status === "draft" && (
                    <Button onClick={() => updateStatus(selected, "submitted")}>Submit for Review</Button>
                  )
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
