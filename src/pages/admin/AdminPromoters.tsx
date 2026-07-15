import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertTriangle, DollarSign, FileSignature, Plus, Search, ShieldCheck, Users } from "lucide-react";
import { TestimonialFormDialog } from "@/components/TestimonialFormDialog";

type PromoterType = "client" | "non_client" | "employee" | "coi";
type AgreementStatus = "draft" | "active" | "expired" | "terminated";

interface Promoter {
  id: string;
  client_id: string;
  full_name: string;
  promoter_type: PromoterType;
  is_ineligible_person: boolean;
  requires_written_agreement: boolean;
  disciplinary_lookback_notes: string | null;
  created_at: string;
}
interface Agreement {
  id: string; promoter_id: string; agreement_url: string | null;
  effective_date: string | null; expiration_date: string | null;
  compensation_type: "cash" | "non_cash" | "none";
  compensation_amount: number | null;
  compensation_period: "one_time" | "monthly" | "annual" | null;
  status: AgreementStatus;
}
interface CompRow {
  id: string; promoter_id: string; amount: number; paid_at: string;
  twelve_month_running_total: number;
}
interface Testimonial {
  id: string; promoter_id: string; testimonial_text: string; material_id: string | null;
  disclosed_client_status: boolean; disclosed_compensation: boolean; disclosed_conflicts: boolean;
  disclosure_method: string | null; disclosure_delivered_at: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<PromoterType, string> = {
  client: "Client", non_client: "Non-Client", employee: "Employee", coi: "COI",
};

const STATUS_COLOR: Record<AgreementStatus, string> = {
  draft: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  expired: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  terminated: "bg-red-500/15 text-red-300 border-red-500/30",
};

export default function AdminPromoters() {
  const { activeClientId } = useWorkspace();
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [activeAgreementByPromoter, setActiveAgreementByPromoter] = useState<Record<string, Agreement>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Promoter | null>(null);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [comp, setComp] = useState<CompRow[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [referralRoi, setReferralRoi] = useState<Array<{
    promoter_id: string; full_name: string; referral_category: string | null;
    lifetime_value: number; deal_count: number;
  }>>([]);
  const [showNewPromoter, setShowNewPromoter] = useState(false);
  const [showNewTestimonial, setShowNewTestimonial] = useState(false);
  const [showNewAgreement, setShowNewAgreement] = useState(false);
  const [showLogComp, setShowLogComp] = useState(false);

  const [newPromoterForm, setNewPromoterForm] = useState({
    full_name: "", promoter_type: "client" as PromoterType,
    is_ineligible_person: false, disciplinary_lookback_notes: "",
  });
  const [newAgreementForm, setNewAgreementForm] = useState({
    agreement_url: "", effective_date: "", expiration_date: "",
    compensation_type: "none" as "cash" | "non_cash" | "none",
    compensation_amount: "", compensation_period: "one_time" as "one_time" | "monthly" | "annual",
    status: "active" as AgreementStatus,
  });
  const [newCompForm, setNewCompForm] = useState({ amount: "", paid_at: "" });

  const load = async () => {
    if (!activeClientId) return;
    setLoading(true);
    const { data: p } = await supabase
      .from("promoters").select("*").eq("client_id", activeClientId)
      .order("created_at", { ascending: false });
    const list = (p as any[]) ?? [];
    setPromoters(list);

    // Latest 12-month total per promoter (from latest comp log row).
    if (list.length > 0) {
      const ids = list.map((x) => x.id);
      const { data: logs } = await supabase
        .from("promoter_compensation_log")
        .select("promoter_id, twelve_month_running_total, paid_at")
        .in("promoter_id", ids)
        .order("paid_at", { ascending: false });
      const t: Record<string, number> = {};
      for (const row of (logs as any[]) ?? []) {
        if (t[row.promoter_id] === undefined) t[row.promoter_id] = Number(row.twelve_month_running_total);
      }
      setTotals(t);

      const { data: agr } = await supabase
        .from("promoter_agreements")
        .select("*")
        .in("promoter_id", ids)
        .eq("status", "active");
      const map: Record<string, Agreement> = {};
      for (const a of (agr as any[]) ?? []) map[a.promoter_id] = a;
      setActiveAgreementByPromoter(map);
    } else {
      setTotals({});
      setActiveAgreementByPromoter({});
    }

    // Referral ROI aggregation for is_referral_source promoters
    const referralPromoters = list.filter((x: any) => x.is_referral_source);
    if (referralPromoters.length > 0) {
      const rids = referralPromoters.map((x: any) => x.id);
      const { data: attrs } = await supabase
        .from("referral_attributions")
        .select("promoter_id, attributed_value, crm_deal_id")
        .in("promoter_id", rids);
      const agg: Record<string, { value: number; count: number }> = {};
      for (const r of (attrs as any[]) ?? []) {
        const bucket = agg[r.promoter_id] ?? { value: 0, count: 0 };
        bucket.value += Number(r.attributed_value ?? 0);
        if (r.crm_deal_id) bucket.count += 1;
        agg[r.promoter_id] = bucket;
      }
      setReferralRoi(
        referralPromoters
          .map((p: any) => ({
            promoter_id: p.id,
            full_name: p.full_name,
            referral_category: p.referral_category ?? null,
            lifetime_value: agg[p.id]?.value ?? 0,
            deal_count: agg[p.id]?.count ?? 0,
          }))
          .sort((a, b) => b.lifetime_value - a.lifetime_value)
      );
    } else {
      setReferralRoi([]);
    }

    setLoading(false);
  };


  const openPromoter = async (p: Promoter) => {
    setSelected(p);
    const [{ data: a }, { data: c }, { data: t }] = await Promise.all([
      supabase.from("promoter_agreements").select("*").eq("promoter_id", p.id).order("effective_date", { ascending: false }),
      supabase.from("promoter_compensation_log").select("*").eq("promoter_id", p.id).order("paid_at", { ascending: false }),
      supabase.from("testimonials").select("*").eq("promoter_id", p.id).order("created_at", { ascending: false }),
    ]);
    setAgreements((a as any[]) ?? []);
    setComp((c as any[]) ?? []);
    setTestimonials((t as any[]) ?? []);
  };

  const filtered = useMemo(
    () => promoters.filter((p) => !search || p.full_name.toLowerCase().includes(search.toLowerCase())),
    [promoters, search]
  );

  const kpis = useMemo(() => {
    const total = promoters.length;
    const requiresAgreement = promoters.filter((p) => p.requires_written_agreement).length;
    const ineligible = promoters.filter((p) => p.is_ineligible_person).length;
    const totalComp = Object.values(totals).reduce((s, v) => s + v, 0);
    return { total, requiresAgreement, ineligible, totalComp };
  }, [promoters, totals]);

  const createPromoter = async () => {
    if (!activeClientId) return;
    if (!newPromoterForm.full_name.trim()) { toast.error("Name required"); return; }
    const { error } = await supabase.from("promoters").insert({
      client_id: activeClientId, ...newPromoterForm,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Promoter added");
    setShowNewPromoter(false);
    setNewPromoterForm({ full_name: "", promoter_type: "client", is_ineligible_person: false, disciplinary_lookback_notes: "" });
    load();
  };

  const createAgreement = async () => {
    if (!selected) return;
    const { error } = await supabase.from("promoter_agreements").insert({
      promoter_id: selected.id,
      agreement_url: newAgreementForm.agreement_url || null,
      effective_date: newAgreementForm.effective_date || null,
      expiration_date: newAgreementForm.expiration_date || null,
      compensation_type: newAgreementForm.compensation_type,
      compensation_amount: newAgreementForm.compensation_amount ? Number(newAgreementForm.compensation_amount) : null,
      compensation_period: newAgreementForm.compensation_period,
      status: newAgreementForm.status,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Agreement added");
    setShowNewAgreement(false);
    openPromoter(selected);
    load();
  };

  const logComp = async () => {
    if (!selected) return;
    if (!newCompForm.amount) { toast.error("Amount required"); return; }
    const { error } = await supabase.from("promoter_compensation_log").insert({
      promoter_id: selected.id,
      amount: Number(newCompForm.amount),
      paid_at: newCompForm.paid_at || new Date().toISOString(),
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Compensation logged");
    setShowLogComp(false);
    setNewCompForm({ amount: "", paid_at: "" });
    // Refresh promoter row to reflect requires_written_agreement flip.
    const { data: refreshed } = await supabase.from("promoters").select("*").eq("id", selected.id).single();
    if (refreshed) setSelected(refreshed as any);
    openPromoter(selected);
    load();
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Promoter & Testimonial Registry"
        description="Track promoters, written agreements, 12-month compensation, and testimonial disclosures for SEC Marketing Rule compliance."
      >
        <Dialog open={showNewPromoter} onOpenChange={setShowNewPromoter}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Promoter</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Promoter</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input value={newPromoterForm.full_name}
                  onChange={(e) => setNewPromoterForm({ ...newPromoterForm, full_name: e.target.value })} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={newPromoterForm.promoter_type}
                  onValueChange={(v) => setNewPromoterForm({ ...newPromoterForm, promoter_type: v as PromoterType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) =>
                      <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={newPromoterForm.is_ineligible_person}
                  onCheckedChange={(c) => setNewPromoterForm({ ...newPromoterForm, is_ineligible_person: !!c })} />
                Ineligible person (Rule 506(d) / disciplinary history)
              </label>
              <div>
                <Label>Disciplinary Lookback Notes</Label>
                <Textarea rows={3} value={newPromoterForm.disciplinary_lookback_notes}
                  onChange={(e) => setNewPromoterForm({ ...newPromoterForm, disciplinary_lookback_notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowNewPromoter(false)}>Cancel</Button>
              <Button onClick={createPromoter}>Save Promoter</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Promoters", value: kpis.total, Icon: Users },
          { label: "Written Agreement Required", value: kpis.requiresAgreement, Icon: FileSignature },
          { label: "Ineligible Persons", value: kpis.ineligible, Icon: AlertTriangle },
          { label: "12-Mo Comp (all)", value: `$${kpis.totalComp.toLocaleString()}`, Icon: DollarSign },
        ].map(({ label, value, Icon }) => (
          <Card key={label} className="border-border bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
                <div className="text-2xl font-bold text-foreground mt-1">{value}</div>
              </div>
              <Icon className="h-6 w-6 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search promoters…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Active Agreement</TableHead>
                <TableHead>12-Mo Comp</TableHead>
                <TableHead>Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No promoters yet.</TableCell></TableRow>
              ) : filtered.map((p) => {
                const agr = activeAgreementByPromoter[p.id];
                const total = totals[p.id] ?? 0;
                return (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openPromoter(p)}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{TYPE_LABELS[p.promoter_type]}</TableCell>
                    <TableCell>
                      {agr ? (
                        <Badge variant="outline" className={STATUS_COLOR.active}>Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-500/15 text-slate-300 border-slate-500/30">None</Badge>
                      )}
                    </TableCell>
                    <TableCell className={total >= 1000 ? "text-amber-300 font-semibold" : ""}>${total.toLocaleString()}</TableCell>
                    <TableCell className="space-x-1">
                      {p.requires_written_agreement && (
                        <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30">
                          Agreement Required
                        </Badge>
                      )}
                      {p.is_ineligible_person && (
                        <Badge variant="outline" className="bg-red-500/15 text-red-300 border-red-500/30">Ineligible</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.full_name}</SheetTitle>
                <SheetDescription>
                  <Badge variant="outline" className="mr-2">{TYPE_LABELS[selected.promoter_type]}</Badge>
                  {selected.requires_written_agreement && (
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30 mr-2">
                      Written Agreement Required
                    </Badge>
                  )}
                  {selected.is_ineligible_person && (
                    <Badge variant="outline" className="bg-red-500/15 text-red-300 border-red-500/30">Ineligible Person</Badge>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Actions row */}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setShowNewTestimonial(true)}>
                    <ShieldCheck className="h-4 w-4 mr-1" />Add Testimonial
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowNewAgreement(true)}>
                    <FileSignature className="h-4 w-4 mr-1" />Add Agreement
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowLogComp(true)}>
                    <DollarSign className="h-4 w-4 mr-1" />Log Compensation
                  </Button>
                </div>

                {/* Agreements */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Agreements ({agreements.length})</h3>
                  {agreements.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No agreements on file.</div>
                  ) : (
                    <div className="space-y-2">
                      {agreements.map((a) => (
                        <div key={a.id} className="rounded-md border border-border bg-muted/20 p-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {a.effective_date ?? "—"} → {a.expiration_date ?? "—"}
                            </span>
                            <Badge variant="outline" className={STATUS_COLOR[a.status]}>{a.status}</Badge>
                          </div>
                          <div className="text-muted-foreground mt-1">
                            {a.compensation_type} {a.compensation_amount ? `· $${a.compensation_amount} ${a.compensation_period}` : ""}
                          </div>
                          {a.agreement_url && (
                            <a href={a.agreement_url} target="_blank" rel="noreferrer" className="text-primary underline">View file</a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Compensation log */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Compensation Log ({comp.length})</h3>
                  {comp.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No payments logged.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Amount</TableHead>
                          <TableHead className="text-xs">12-Mo Running</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comp.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="text-xs">{new Date(c.paid_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-xs">${Number(c.amount).toLocaleString()}</TableCell>
                            <TableCell className={`text-xs ${Number(c.twelve_month_running_total) >= 1000 ? "text-amber-300 font-semibold" : ""}`}>
                              ${Number(c.twelve_month_running_total).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </section>

                {/* Testimonials */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Testimonials ({testimonials.length})</h3>
                  {testimonials.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No testimonials on file.</div>
                  ) : (
                    <div className="space-y-2">
                      {testimonials.map((t) => {
                        const allThree = t.disclosed_client_status && t.disclosed_compensation && t.disclosed_conflicts;
                        return (
                          <div key={t.id} className="rounded-md border border-border bg-muted/20 p-2 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                              <div className="flex gap-1">
                                <Badge variant="outline" className={allThree ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-red-500/15 text-red-300 border-red-500/30"}>
                                  {allThree ? "All disclosures ✓" : "Disclosures incomplete"}
                                </Badge>
                                {t.material_id && <Badge variant="outline">Linked</Badge>}
                              </div>
                            </div>
                            <div className="whitespace-pre-wrap">"{t.testimonial_text}"</div>
                            {t.disclosure_method === "linked" && (
                              <div className="text-amber-300 mt-1 text-[11px]">
                                Note: hyperlinked-only disclosure — SEC guidance flags as potentially not prominent.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {selected.disciplinary_lookback_notes && (
                  <section>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Disciplinary Lookback Notes</h3>
                    <div className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/20 border border-border rounded p-2">
                      {selected.disciplinary_lookback_notes}
                    </div>
                  </section>
                )}
              </div>

              {/* Add Testimonial */}
              <TestimonialFormDialog
                open={showNewTestimonial}
                onOpenChange={setShowNewTestimonial}
                promoterId={selected.id}
                onSaved={() => openPromoter(selected)}
              />

              {/* Add Agreement */}
              <Dialog open={showNewAgreement} onOpenChange={setShowNewAgreement}>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>New Agreement</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Agreement URL</Label>
                      <Input value={newAgreementForm.agreement_url}
                        onChange={(e) => setNewAgreementForm({ ...newAgreementForm, agreement_url: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Effective</Label>
                        <Input type="date" value={newAgreementForm.effective_date}
                          onChange={(e) => setNewAgreementForm({ ...newAgreementForm, effective_date: e.target.value })} /></div>
                      <div><Label>Expires</Label>
                        <Input type="date" value={newAgreementForm.expiration_date}
                          onChange={(e) => setNewAgreementForm({ ...newAgreementForm, expiration_date: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Compensation Type</Label>
                        <Select value={newAgreementForm.compensation_type}
                          onValueChange={(v) => setNewAgreementForm({ ...newAgreementForm, compensation_type: v as any })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="non_cash">Non-Cash</SelectItem>
                          </SelectContent>
                        </Select></div>
                      <div><Label>Period</Label>
                        <Select value={newAgreementForm.compensation_period}
                          onValueChange={(v) => setNewAgreementForm({ ...newAgreementForm, compensation_period: v as any })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="one_time">One-time</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                          </SelectContent>
                        </Select></div>
                    </div>
                    <div><Label>Amount</Label>
                      <Input type="number" value={newAgreementForm.compensation_amount}
                        onChange={(e) => setNewAgreementForm({ ...newAgreementForm, compensation_amount: e.target.value })} /></div>
                    <div><Label>Status</Label>
                      <Select value={newAgreementForm.status}
                        onValueChange={(v) => setNewAgreementForm({ ...newAgreementForm, status: v as AgreementStatus })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select></div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setShowNewAgreement(false)}>Cancel</Button>
                    <Button onClick={createAgreement}>Save Agreement</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Log Compensation */}
              <Dialog open={showLogComp} onOpenChange={setShowLogComp}>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Log Compensation</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Amount ($)</Label>
                      <Input type="number" value={newCompForm.amount}
                        onChange={(e) => setNewCompForm({ ...newCompForm, amount: e.target.value })} /></div>
                    <div><Label>Paid At</Label>
                      <Input type="datetime-local" value={newCompForm.paid_at}
                        onChange={(e) => setNewCompForm({ ...newCompForm, paid_at: e.target.value })} /></div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setShowLogComp(false)}>Cancel</Button>
                    <Button onClick={logComp}>Log Payment</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
