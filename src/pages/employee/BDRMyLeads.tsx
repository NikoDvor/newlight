import { useEffect, useMemo, useState } from "react";
import { Plus, Upload, Search, Phone, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

/* ─── types ─── */
interface BdrLead {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  website: string | null;
  niche: string | null;
  city: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const STATUS_CFG: Record<string, { label: string; bg: string; text: string }> = {
  new_lead:    { label: "New Lead",    bg: "hsla(211,96%,56%,.15)", text: "hsl(211,96%,56%)" },
  contacted:   { label: "Contacted",   bg: "hsla(187,80%,50%,.15)", text: "hsl(187,80%,50%)" },
  appointment_booked: { label: "Booked", bg: "hsla(263,70%,55%,.15)", text: "hsl(263,70%,55%)" },
  closed_won:  { label: "Closed Won",  bg: "hsla(142,72%,42%,.15)", text: "hsl(142,72%,42%)" },
  closed_lost: { label: "Closed Lost", bg: "hsla(0,0%,50%,.15)",    text: "hsl(0,0%,60%)" },
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "new_lead", label: "New Lead" },
  { key: "contacted", label: "Contacted" },
  { key: "appointment_booked", label: "Booked" },
  { key: "closed_won", label: "Won" },
  { key: "closed_lost", label: "Lost" },
];

const OUTCOME_OPTIONS = [
  { value: "contacted", label: "Contacted — No Answer / Left VM" },
  { value: "contacted", label: "Contacted — Spoke With Owner" },
  { value: "appointment_booked", label: "Appointment Booked" },
  { value: "closed_won", label: "Closed Won" },
  { value: "closed_lost", label: "Closed Lost" },
];

/* ─── page ─── */
export default function BDRMyLeads() {
  const { user } = useWorkspace();
  const [leads, setLeads] = useState<BdrLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [outcomeLeadId, setOutcomeLeadId] = useState<string | null>(null);

  const fetchLeads = async () => {
    if (!user?.id) return;
    const { data } = await (supabase as any).from("nl_bdr_leads")
      .select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setLeads(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, [user?.id]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = leads.filter(l => l.created_at.slice(0, 10) === todayStr).length;

  const filtered = useMemo(() => {
    let list = leads;
    if (filter === "today") list = list.filter(l => l.created_at.slice(0, 10) === todayStr);
    else if (filter !== "all") list = list.filter(l => l.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l => l.business_name.toLowerCase().includes(q) || (l.owner_name || "").toLowerCase().includes(q));
    }
    return list;
  }, [leads, filter, search, todayStr]);

  const stats = useMemo(() => {
    const total = leads.length;
    const contacted = leads.filter(l => l.status === "contacted").length;
    const booked = leads.filter(l => l.status === "appointment_booked").length;
    const won = leads.filter(l => l.status === "closed_won").length;
    return { total, contacted, booked, won, rate: total ? Math.round((booked / total) * 100) : 0 };
  }, [leads]);

  /* ─── CRM auto-link helper ─── */
  const createCRMRecords = async (lead: { business_name: string; owner_name?: string; phone?: string; website?: string }, leadId: string) => {
    if (!user?.id) return;
    // Create crm_contact
    const { data: contact } = await supabase.from("crm_contacts").insert({
      full_name: lead.owner_name || lead.business_name,
      phone: lead.phone || null,
      lead_source: "bdr_field",
      contact_status: "lead",
      contact_owner: user.id,
    } as any).select("id").single();

    if (contact) {
      // Create crm_deal
      const { data: deal } = await supabase.from("crm_deals").insert({
        deal_name: `${lead.business_name} — BDR Lead`,
        pipeline_stage: "new_lead",
        status: "open",
        lead_source: "bdr_field",
        assigned_user: user.id,
        contact_id: contact.id,
      } as any).select("id").single();

      // Link back
      await (supabase as any).from("nl_bdr_leads").update({
        crm_contact_id: contact.id,
        crm_deal_id: deal?.id || null,
      }).eq("id", leadId);
    }
  };

  /* ─── add single lead ─── */
  const handleAddLead = async (form: Record<string, string>) => {
    if (!user?.id) return;
    const { data, error } = await (supabase as any).from("nl_bdr_leads").insert({
      user_id: user.id,
      business_name: form.business_name,
      owner_name: form.owner_name || null,
      phone: form.phone || null,
      website: form.website || null,
      niche: form.niche || null,
      city: form.city || null,
      notes: form.notes || null,
    }).select("id").single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await createCRMRecords(form as any, data.id);
    toast({ title: "Lead added" });
    setShowAdd(false);
    fetchLeads();
  };

  /* ─── import leads ─── */
  const handleImport = async (rows: { business_name: string; owner_name: string; phone: string; website: string }[]) => {
    if (!user?.id) return;
    let count = 0;
    for (const row of rows) {
      const { data } = await (supabase as any).from("nl_bdr_leads").insert({
        user_id: user.id,
        business_name: row.business_name,
        owner_name: row.owner_name || null,
        phone: row.phone || null,
        website: row.website || null,
      }).select("id").single();
      if (data) { await createCRMRecords(row, data.id); count++; }
    }
    toast({ title: `${count} leads imported` });
    setShowImport(false);
    fetchLeads();
  };

  /* ─── log outcome ─── */
  const handleOutcome = async (status: string) => {
    if (!outcomeLeadId) return;
    await (supabase as any).from("nl_bdr_leads").update({ status }).eq("id", outcomeLeadId);
    setOutcomeLeadId(null);
    fetchLeads();
    toast({ title: "Status updated" });
  };

  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Leads</h1>
          <p className="text-sm text-muted-foreground">{dateLabel} · {todayCount} leads today · {leads.length} total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4 mr-1" /> Import
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Total", value: stats.total },
          { label: "Contacted", value: stats.contacted },
          { label: "Booked", value: stats.booked },
          { label: "Won", value: stats.won },
          { label: "Conv %", value: `${stats.rate}%` },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" }}>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-1 flex-wrap">
          {FILTER_TABS.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                background: filter === t.key ? "hsl(211,96%,56%)" : "hsla(211,96%,60%,.08)",
                color: filter === t.key ? "#fff" : "hsl(211,96%,56%)",
              }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..." className="pl-9 h-8 text-sm" />
        </div>
      </div>

      {/* Lead cards */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-12">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No leads yet. Add your first lead or import from Claude.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(lead => {
            const cfg = STATUS_CFG[lead.status] || STATUS_CFG.new_lead;
            return (
              <div key={lead.id} className="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                style={{ background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground truncate">{lead.business_name}</span>
                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
                  </div>
                  {lead.owner_name && <p className="text-sm text-muted-foreground">{lead.owner_name}</p>}
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} className="text-xs flex items-center gap-1" style={{ color: "hsl(211,96%,56%)" }}>
                        <Phone className="h-3 w-3" /> {lead.phone}
                      </a>
                    )}
                    {lead.website && (
                      <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer"
                        className="text-xs flex items-center gap-1" style={{ color: "hsl(211,96%,56%)" }}>
                        <ExternalLink className="h-3 w-3" /> Website
                      </a>
                    )}
                    {lead.city && <span className="text-xs text-muted-foreground">{lead.city}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground">{new Date(lead.created_at).toLocaleDateString()}</span>
                  {(lead.status === "new_lead" || lead.status === "contacted") && (
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setOutcomeLeadId(lead.id)}>Log Outcome</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Import Modal ─── */}
      <ImportModal open={showImport} onClose={() => setShowImport(false)} onImport={handleImport} />

      {/* ─── Add Lead Modal ─── */}
      <AddLeadModal open={showAdd} onClose={() => setShowAdd(false)} onSave={handleAddLead} />

      {/* ─── Outcome Modal ─── */}
      <Dialog open={!!outcomeLeadId} onOpenChange={() => setOutcomeLeadId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Outcome</DialogTitle>
            <DialogDescription>Select the result of your outreach.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {OUTCOME_OPTIONS.map((o, i) => (
              <button key={i} onClick={() => handleOutcome(o.value)}
                className="w-full text-left rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-primary/10"
                style={{ border: "1px solid hsla(211,96%,60%,.15)" }}>
                {o.label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/* Import Modal                                    */
/* ═══════════════════════════════════════════════ */
function ImportModal({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (rows: any[]) => void }) {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<any[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);

  useEffect(() => { if (!open) { setRaw(""); setParsed([]); setChecked([]); } }, [open]);

  const parse = () => {
    const lines = raw.trim().split("\n").filter(Boolean);
    if (!lines.length) return;

    // detect delimiter
    const delim = lines[0].includes("\t") ? "\t" : lines[0].includes("|") ? "|" : ",";
    const rows = lines.map(l => l.split(delim).map(c => c.trim()));

    // detect header row
    const headerLike = rows[0].some(c => /business|name|phone|website/i.test(c));
    const dataRows = headerLike ? rows.slice(1) : rows;

    // map columns — flexible
    let biIdx = 0, owIdx = 1, phIdx = 2, webIdx = 3;
    if (headerLike) {
      const h = rows[0].map(c => c.toLowerCase());
      h.forEach((c, i) => {
        if (/business/.test(c)) biIdx = i;
        else if (/owner|contact/.test(c)) owIdx = i;
        else if (/phone/.test(c)) phIdx = i;
        else if (/website|url|site/.test(c)) webIdx = i;
      });
    }

    const result = dataRows.filter(r => r.length >= 1 && r[biIdx]?.trim()).map(r => ({
      business_name: r[biIdx]?.trim() || "",
      owner_name: r[owIdx]?.trim() || "",
      phone: r[phIdx]?.trim() || "",
      website: r[webIdx]?.trim() || "",
    }));
    setParsed(result);
    setChecked(result.map(() => true));
  };

  const toggle = (i: number) => setChecked(prev => { const n = [...prev]; n[i] = !n[i]; return n; });
  const selectedCount = checked.filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import from Claude</DialogTitle>
          <DialogDescription>Paste your cleaned lead table from Claude.ai</DialogDescription>
        </DialogHeader>
        {parsed.length === 0 ? (
          <div className="space-y-3">
            <Textarea value={raw} onChange={e => setRaw(e.target.value)} rows={10}
              placeholder={"Paste your lead table here. Format:\nBusiness Name | Owner Name | Phone | Website\n\nExample:\nJoe's HVAC | Joe Martinez | (805) 555-1234 | joeshvac.com"} />
            <Button onClick={parse} disabled={!raw.trim()} className="w-full">Parse Leads</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{parsed.length} leads found</p>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {parsed.map((r, i) => (
                <label key={i} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm cursor-pointer"
                  style={{ background: checked[i] ? "hsla(211,96%,56%,.06)" : "transparent", border: "1px solid hsla(211,96%,60%,.1)" }}>
                  <input type="checkbox" checked={checked[i]} onChange={() => toggle(i)} className="accent-[hsl(211,96%,56%)]" />
                  <span className="font-medium text-foreground truncate">{r.business_name}</span>
                  <span className="text-muted-foreground truncate hidden sm:inline">— {r.owner_name || "N/A"}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setParsed([]); setChecked([]); }}>Back</Button>
              <Button onClick={() => onImport(parsed.filter((_, i) => checked[i]))} disabled={!selectedCount} className="flex-1">
                Import {selectedCount} Lead{selectedCount !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════ */
/* Add Lead Modal                                  */
/* ═══════════════════════════════════════════════ */
function AddLeadModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (f: Record<string, string>) => void }) {
  const [form, setForm] = useState<Record<string, string>>({ business_name: "", owner_name: "", phone: "", website: "", niche: "", city: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!open) setForm({ business_name: "", owner_name: "", phone: "", website: "", niche: "", city: "", notes: "" }); }, [open]);

  const handleSave = async () => {
    if (!form.business_name.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const field = (key: string, label: string, required = false) => (
    <div key={key}>
      <label className="text-xs font-medium text-muted-foreground">{label}{required && " *"}</label>
      {key === "notes" ? (
        <Textarea value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} rows={3} className="mt-1" />
      ) : (
        <Input value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="mt-1 h-9" />
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Lead</DialogTitle>
          <DialogDescription>Enter a new lead manually.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          {field("business_name", "Business Name", true)}
          {field("owner_name", "Owner Name")}
          {field("phone", "Phone")}
          {field("website", "Website")}
          {field("niche", "Niche")}
          {field("city", "City")}
          {field("notes", "Notes")}
          <Button onClick={handleSave} disabled={!form.business_name.trim() || saving} className="w-full">
            {saving ? "Saving..." : "Save Lead"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
