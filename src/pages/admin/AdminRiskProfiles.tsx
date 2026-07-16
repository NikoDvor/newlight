import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, ShieldCheck } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const RISK_LEVELS = [
  { v: "conservative", l: "Conservative" },
  { v: "moderate_conservative", l: "Moderate Conservative" },
  { v: "moderate", l: "Moderate" },
  { v: "moderate_aggressive", l: "Moderate Aggressive" },
  { v: "aggressive", l: "Aggressive" },
];
const NET_WORTH_RANGES = ["$0-250k", "$250k-1M", "$1M-5M", "$5M+"];
const INCOME_RANGES = ["$0-100k", "$100k-250k", "$250k-500k", "$500k+"];
const GOALS = [
  { v: "retirement", l: "Retirement" },
  { v: "education", l: "Education" },
  { v: "wealth_transfer", l: "Wealth Transfer" },
  { v: "tax_reduction", l: "Tax Reduction" },
  { v: "income_generation", l: "Income Generation" },
  { v: "capital_preservation", l: "Capital Preservation" },
  { v: "other", l: "Other" },
];

interface Profile {
  id: string;
  contact_id: string;
  client_id: string;
  risk_tolerance: string | null;
  time_horizon_years: number | null;
  net_worth_range: string | null;
  annual_income_range: string | null;
  primary_goals: string[];
  existing_accounts_notes: string | null;
  completed_at: string | null;
  updated_at: string;
  crm_contacts?: { full_name: string; email: string | null } | null;
}

const emptyForm = {
  contact_id: "",
  risk_tolerance: "",
  time_horizon_years: "",
  net_worth_range: "",
  annual_income_range: "",
  primary_goals: [] as string[],
  existing_accounts_notes: "",
  mark_completed: false,
};

export default function AdminRiskProfiles() {
  const { activeClientId, user } = useWorkspace();
  const [rows, setRows] = useState<Profile[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("client_risk_profiles" as any)
      .select("*, crm_contacts(full_name, email)")
      .order("updated_at", { ascending: false });
    if (activeClientId) q = q.eq("client_id", activeClientId);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows(((data as any[]) ?? []) as Profile[]);

    if (activeClientId) {
      const { data: cs } = await supabase
        .from("crm_contacts")
        .select("id, full_name, email")
        .eq("client_id", activeClientId)
        .order("full_name");
      setContacts(cs ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [activeClientId]);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm }); setShowForm(true); };
  const openEdit = (p: Profile) => {
    setEditing(p);
    setForm({
      contact_id: p.contact_id,
      risk_tolerance: p.risk_tolerance ?? "",
      time_horizon_years: p.time_horizon_years?.toString() ?? "",
      net_worth_range: p.net_worth_range ?? "",
      annual_income_range: p.annual_income_range ?? "",
      primary_goals: p.primary_goals ?? [],
      existing_accounts_notes: p.existing_accounts_notes ?? "",
      mark_completed: !!p.completed_at,
    });
    setShowForm(true);
  };

  const toggleGoal = (v: string) => {
    setForm(f => ({
      ...f,
      primary_goals: f.primary_goals.includes(v)
        ? f.primary_goals.filter(g => g !== v)
        : [...f.primary_goals, v],
    }));
  };

  const save = async () => {
    if (!form.contact_id) { toast.error("Contact is required"); return; }
    if (!activeClientId) { toast.error("No active workspace"); return; }
    const payload: any = {
      contact_id: form.contact_id,
      client_id: activeClientId,
      risk_tolerance: form.risk_tolerance || null,
      time_horizon_years: form.time_horizon_years ? parseInt(form.time_horizon_years, 10) : null,
      net_worth_range: form.net_worth_range || null,
      annual_income_range: form.annual_income_range || null,
      primary_goals: form.primary_goals,
      existing_accounts_notes: form.existing_accounts_notes || null,
      completed_at: form.mark_completed ? (editing?.completed_at ?? new Date().toISOString()) : null,
    };
    if (editing) {
      const { error } = await supabase
        .from("client_risk_profiles" as any)
        .update(payload)
        .eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Risk profile updated");
    } else {
      payload.created_by = user?.id ?? null;
      const { error } = await supabase.from("client_risk_profiles" as any).insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Risk profile saved");
    }
    setShowForm(false);
    await load();
  };

  const contactName = (id: string) => contacts.find(c => c.id === id)?.full_name ?? "—";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[hsl(var(--nl-sky))]" />
            Risk Profiles
          </h1>
          <p className="text-sm text-white/50 mt-1">
            KYC / risk-tolerance fact-finder per contact. Feeds suitability review and money-in-motion signals.
          </p>
        </div>
        <Button onClick={openNew} disabled={!activeClientId}>
          <Plus className="h-4 w-4 mr-1" /> New Profile
        </Button>
      </div>

      {loading ? (
        <div className="text-white/50 text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-white/50 text-sm">No risk profiles captured yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((p) => (
            <Card key={p.id} className="border-0 bg-white/[0.04]">
              <CardContent className="p-4 space-y-3">
                <div>
                  <div className="font-semibold text-white">{p.crm_contacts?.full_name ?? "(no contact)"}</div>
                  <div className="text-xs text-white/50">{p.crm_contacts?.email ?? ""}</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.risk_tolerance && <Badge variant="outline">{RISK_LEVELS.find(r => r.v === p.risk_tolerance)?.l}</Badge>}
                  {p.time_horizon_years != null && <Badge variant="outline">{p.time_horizon_years}y horizon</Badge>}
                  {p.net_worth_range && <Badge variant="outline">NW {p.net_worth_range}</Badge>}
                  {p.annual_income_range && <Badge variant="outline">Inc {p.annual_income_range}</Badge>}
                  {p.completed_at && <Badge className="bg-emerald-500/20 text-emerald-300">Completed</Badge>}
                </div>
                {p.primary_goals?.length > 0 && (
                  <div className="text-xs text-white/60">
                    Goals: {p.primary_goals.map(g => GOALS.find(x => x.v === g)?.l ?? g).join(", ")}
                  </div>
                )}
                {p.existing_accounts_notes && (
                  <p className="text-xs text-white/60 line-clamp-3 whitespace-pre-wrap">
                    {p.existing_accounts_notes}
                  </p>
                )}
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                  <Edit className="h-3 w-3 mr-1" /> Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit Profile — ${contactName(form.contact_id)}` : "New Risk Profile"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Contact</Label>
              <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}{c.email ? ` — ${c.email}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Risk Tolerance</Label>
                <Select value={form.risk_tolerance} onValueChange={(v) => setForm({ ...form, risk_tolerance: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {RISK_LEVELS.map(r => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Time Horizon (years)</Label>
                <Input
                  type="number" min={0}
                  value={form.time_horizon_years}
                  onChange={(e) => setForm({ ...form, time_horizon_years: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Net Worth</Label>
                <Select value={form.net_worth_range} onValueChange={(v) => setForm({ ...form, net_worth_range: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {NET_WORTH_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Annual Income</Label>
                <Select value={form.annual_income_range} onValueChange={(v) => setForm({ ...form, annual_income_range: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {INCOME_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Primary Goals (multi-select)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {GOALS.map(g => {
                  const on = form.primary_goals.includes(g.v);
                  return (
                    <button
                      key={g.v} type="button" onClick={() => toggleGoal(g.v)}
                      className={`px-2.5 py-1 rounded-full text-xs border transition ${
                        on ? "bg-[hsl(var(--nl-electric))] text-white border-transparent"
                           : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {g.l}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Existing Accounts / Held-Away Assets Notes</Label>
              <Textarea
                rows={5}
                value={form.existing_accounts_notes}
                onChange={(e) => setForm({ ...form, existing_accounts_notes: e.target.value })}
                placeholder="e.g., 401(k) with former employer, brokerage account elsewhere, inherited IRA…"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.mark_completed}
                onChange={(e) => setForm({ ...form, mark_completed: e.target.checked })}
              />
              Mark fact-finder as completed
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save Changes" : "Save Profile"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
