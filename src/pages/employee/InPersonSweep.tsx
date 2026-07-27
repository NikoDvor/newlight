import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Copy, Loader2, MapPin, Plus, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

export interface InPersonStreet {
  id: string;
  street_name: string;
  city: string;
  state: string;
  starting_cross_street: string | null;
  status: string;
  current_position: number;
  total_count: number;
  updated_at: string;
}

export interface ParsedSweepRow {
  business_name: string;
  owner_name: string | null;
  website: string | null;
  has_booking_page: boolean | null;
  sells_online: boolean | null;
  niche: string | null;
  address: string | null;
  outcome: string | null;
  notes: string | null;
}

/** Yes / No / N/A -> true / false / null */
export function parseTriState(raw: string | undefined): boolean | null {
  const v = (raw || "").trim().toLowerCase();
  if (!v || v === "n/a" || v === "na" || v === "-" || v === "unknown") return null;
  if (v.startsWith("y") || v === "true") return true;
  if (v.startsWith("n")) return false;
  return null;
}

/** Parse the 9-column pipe-delimited sweep table, preserving pasted order. */
export function parseSweepTable(raw: string): ParsedSweepRow[] {
  const out: ParsedSweepRow[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes("|")) continue;
    // skip markdown separator rows like |---|---|
    if (/^\|?[\s:|-]+\|?$/.test(trimmed)) continue;
    let cells = trimmed.split("|").map((c) => c.trim());
    if (cells.length && cells[0] === "") cells = cells.slice(1);
    if (cells.length && cells[cells.length - 1] === "") cells = cells.slice(0, -1);
    if (cells.length < 2) continue;
    const first = (cells[0] || "").toLowerCase();
    if (first === "business name" || first === "business") continue; // header
    if (!cells[0]) continue;
    out.push({
      business_name: cells[0],
      owner_name: cells[1] || null,
      website: cells[2] || null,
      has_booking_page: parseTriState(cells[3]),
      sells_online: parseTriState(cells[4]),
      niche: cells[5] || null,
      address: cells[6] || null,
      outcome: cells[7] || null,
      notes: cells[8] || null,
    });
  }
  return out;
}

export function extractPromptVersion(content: string | null): string | null {
  if (!content) return null;
  const m = content.match(/—\s*(V\d+(?:\.\d+)?)/i) || content.match(/\b(V\d+(?:\.\d+)?)\b/);
  return m ? m[1].toUpperCase() : null;
}

const cardStyle = {
  background: "hsla(215,35%,10%,.7)",
  border: "1px solid hsla(211,96%,60%,.16)",
};

export default function InPersonSweep() {
  const navigate = useNavigate();
  const { user } = useWorkspace();
  const [streets, setStreets] = useState<InPersonStreet[]>([]);
  const [loading, setLoading] = useState(true);

  // guide
  const [guideOpen, setGuideOpen] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);

  // new street
  const [newOpen, setNewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ street_name: "", city: "Santa Barbara", state: "CA", cross: "" });

  // import
  const [importStreet, setImportStreet] = useState<InPersonStreet | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [parsed, setParsed] = useState<ParsedSweepRow[] | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchStreets = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("nl_inperson_streets")
      .select("id, street_name, city, state, starting_cross_street, status, current_position, total_count, updated_at")
      .eq("rep_user_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) toast({ title: "Couldn't load streets", description: error.message, variant: "destructive" });
    setStreets((data as InPersonStreet[]) || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchStreets(); }, [fetchStreets]);

  const openGuide = async () => {
    setGuideOpen(true);
    if (prompt) return;
    setPromptLoading(true);
    const { data, error } = await (supabase as any)
      .from("nl_inperson_master_prompt")
      .select("content")
      .limit(1)
      .maybeSingle();
    if (error) toast({ title: "Couldn't load guide", description: error.message, variant: "destructive" });
    setPrompt((data as any)?.content || null);
    setPromptLoading(false);
  };

  const version = useMemo(() => extractPromptVersion(prompt), [prompt]);

  const copyPrompt = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      toast({ title: "Prompt copied" });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard access blocked by browser.", variant: "destructive" });
    }
  };

  const createStreet = async () => {
    if (!user?.id) return;
    if (!form.street_name.trim() || !form.city.trim() || !form.state.trim()) {
      toast({ title: "Missing fields", description: "Street, city and state are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("nl_inperson_streets").insert({
      rep_user_id: user.id,
      street_name: form.street_name.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
      starting_cross_street: form.cross.trim() || null,
      status: "not_started",
      current_position: 0,
      total_count: 0,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't create street", description: error.message, variant: "destructive" });
      return;
    }
    setNewOpen(false);
    setForm({ street_name: "", city: "Santa Barbara", state: "CA", cross: "" });
    toast({ title: "Street added" });
    fetchStreets();
  };

  const openImport = (s: InPersonStreet) => {
    setImportStreet(s);
    setPasteText("");
    setParsed(null);
  };

  const confirmImport = async () => {
    if (!importStreet || !parsed || parsed.length === 0) return;
    setImporting(true);
    try {
      const { data: existing } = await (supabase as any)
        .from("nl_inperson_leads")
        .select("walk_sequence")
        .eq("street_id", importStreet.id)
        .order("walk_sequence", { ascending: false })
        .limit(1);
      const startSeq = (existing?.[0]?.walk_sequence as number | undefined) || 0;

      const rows = parsed.map((r, i) => ({
        street_id: importStreet.id,
        walk_sequence: startSeq + i + 1,
        business_name: r.business_name,
        owner_name: r.owner_name,
        website: r.website,
        has_booking_page: r.has_booking_page,
        sells_online: r.sells_online,
        niche: r.niche,
        address: r.address,
        notes: r.notes,
        status: "pending",
      }));

      const { error } = await (supabase as any).from("nl_inperson_leads").insert(rows);
      if (error) throw error;

      const newTotal = startSeq + rows.length;
      const { error: upErr } = await (supabase as any)
        .from("nl_inperson_streets")
        .update({
          total_count: newTotal,
          status: importStreet.status === "complete" ? "in_progress" : importStreet.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", importStreet.id);
      if (upErr) throw upErr;

      toast({ title: `Imported ${rows.length} business${rows.length === 1 ? "" : "es"}` });
      setImportStreet(null);
      setParsed(null);
      setPasteText("");
      fetchStreets();
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[hsl(211,96%,68%)]" /> In-Person
          </h1>
          <p className="text-xs text-white/50 mt-1">Walk a street, work it live.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={openGuide} className="text-white/60">
          <BookOpen className="h-4 w-4 mr-1" /> Guide
        </Button>
      </div>

      <Button onClick={() => setNewOpen(true)} className="w-full sm:w-auto">
        <Plus className="h-4 w-4 mr-1" /> New Street
      </Button>

      <div className="space-y-2">
        <h2 className="text-[11px] uppercase tracking-widest text-white/40">Active Streets</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-white/50 text-sm py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading streets…
          </div>
        ) : streets.length === 0 ? (
          <div className="rounded-xl p-6 text-center text-sm text-white/45" style={cardStyle}>
            No streets yet. Create one to start a sweep.
          </div>
        ) : (
          streets.map((s) => {
            const notStarted = s.total_count === 0;
            const complete = s.status === "complete";
            return (
              <div key={s.id} className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3" style={cardStyle}>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white break-words">{s.street_name}</div>
                  <div className="text-[11px] text-white/50">
                    {s.city}, {s.state}
                    {s.starting_cross_street ? ` · from ${s.starting_cross_street}` : ""}
                  </div>
                  <div className="mt-1">
                    {notStarted ? (
                      <Badge variant="secondary" className="text-[10px]">Not started</Badge>
                    ) : (
                      <span className="text-xs text-white/70">{s.current_position} of {s.total_count}</span>
                    )}
                  </div>
                </div>
                {notStarted ? (
                  <Button size="sm" variant="secondary" onClick={() => openImport(s)}>
                    <Upload className="h-4 w-4 mr-1" /> Import Leads
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => navigate(`/employee/in-person/${s.id}`)}>
                    {complete ? "View Completed" : "Continue Walk"}
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Guide */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Street Sweep Guide
              {version && <Badge variant="secondary" className="text-[10px]">{version}</Badge>}
            </DialogTitle>
            <DialogDescription>Copy this prompt into your research assistant to build a street list.</DialogDescription>
          </DialogHeader>
          {promptLoading ? (
            <div className="flex items-center gap-2 text-white/50 text-sm py-6">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <pre
              className="max-h-[55vh] overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-white/75 rounded-lg p-3"
              style={cardStyle}
            >
              {prompt || "No guide content found."}
            </pre>
          )}
          <DialogFooter>
            <Button onClick={copyPrompt} disabled={!prompt}>
              <Copy className="h-4 w-4 mr-1" /> Copy Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New street */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Street</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Street Name *</Label>
              <Input value={form.street_name} onChange={(e) => setForm({ ...form, street_name: e.target.value })} placeholder="State St" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">City *</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">State *</Label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Starting Cross-Street</Label>
              <Input value={form.cross} onChange={(e) => setForm({ ...form, cross: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={createStreet} disabled={saving}>{saving ? "Saving…" : "Create Street"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import */}
      <Dialog open={!!importStreet} onOpenChange={(o) => !o && setImportStreet(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import Leads {importStreet ? `— ${importStreet.street_name}` : ""}</DialogTitle>
            <DialogDescription>
              Paste the 9-column table: Business Name | Owner Name | Website | Booking Page | Online Sales Setup | Niche | Address | Outcome | Additional Notes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={pasteText}
              onChange={(e) => { setPasteText(e.target.value); setParsed(null); }}
              rows={8}
              placeholder="Paste rows here…"
              className="font-mono text-[11px]"
            />
            {parsed && (
              <div className="max-h-[35vh] overflow-auto rounded-lg" style={cardStyle}>
                <table className="w-full text-[11px]">
                  <thead className="text-white/45">
                    <tr className="text-left">
                      <th className="p-2">#</th><th className="p-2">Business</th><th className="p-2">Owner</th>
                      <th className="p-2">Booking</th><th className="p-2">Online</th><th className="p-2">Niche</th><th className="p-2">Address</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/75">
                    {parsed.map((r, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td className="p-2 text-white/40">{i + 1}</td>
                        <td className="p-2">{r.business_name}</td>
                        <td className="p-2">{r.owner_name || "—"}</td>
                        <td className="p-2">{r.has_booking_page === null ? "—" : r.has_booking_page ? "Yes" : "No"}</td>
                        <td className="p-2">{r.sells_online === null ? "—" : r.sells_online ? "Yes" : "No"}</td>
                        <td className="p-2">{r.niche || "—"}</td>
                        <td className="p-2">{r.address || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportStreet(null)}>Cancel</Button>
            {!parsed ? (
              <Button onClick={() => {
                const rows = parseSweepTable(pasteText);
                if (rows.length === 0) {
                  toast({ title: "Nothing parsed", description: "Check the pasted format.", variant: "destructive" });
                  return;
                }
                setParsed(rows);
              }} disabled={!pasteText.trim()}>Parse</Button>
            ) : (
              <Button onClick={confirmImport} disabled={importing}>
                {importing ? "Importing…" : `Confirm Import (${parsed.length})`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
