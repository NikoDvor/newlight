import { useEffect, useMemo, useState } from "react";
import { Phone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const OUTCOMES = [
  "Connected",
  "Scheduled Appointment",
  "Voicemail",
  "No Answer",
  "Callback Requested",
  "Not Interested",
  "Wrong Number",
  "Do Not Call",
  "Won",
  "Lost",
];

type CallRow = {
  id: string;
  user_id: string;
  contact_id: string | null;
  outcome: string;
  notes: string | null;
  logged_at: string;
};

type Contact = { id: string; full_name: string | null; phone: string | null };

function inBucket(dateStr: string | null, bucket: "today" | "week" | "month" | "all") {
  if (!dateStr) return false;
  if (bucket === "all") return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (bucket === "today") return d.toDateString() === now.toDateString();
  if (bucket === "week") {
    const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0, 0, 0, 0);
    return d >= s;
  }
  if (bucket === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return false;
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold text-foreground mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function CallTracking() {
  const { user, activeClientId } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState<string>("");
  const [outcome, setOutcome] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const fetchAll = async () => {
    if (!user || !activeClientId) return;
    setLoading(true);
    const [callsRes, contactsRes] = await Promise.all([
      supabase
        .from("client_call_outcomes")
        .select("id,user_id,contact_id,outcome,notes,logged_at")
        .eq("client_id", activeClientId)
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false })
        .limit(500),
      supabase
        .from("crm_contacts")
        .select("id, full_name, phone")
        .eq("client_id", activeClientId)
        .order("full_name", { ascending: true })
        .limit(500),
    ]);
    setCalls((callsRes.data as CallRow[]) || []);
    setContacts((contactsRes.data as Contact[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [user?.id, activeClientId]);

  const handleLog = async () => {
    if (!user || !activeClientId) return;
    if (!outcome) {
      toast({ title: "Choose an outcome", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("client_call_outcomes").insert({
      client_id: activeClientId,
      user_id: user.id,
      contact_id: contactId || null,
      outcome,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Failed to log call", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Call logged" });
    setOutcome("");
    setNotes("");
    setContactId("");
    fetchAll();
  };

  const buckets = useMemo(() => {
    const b = { today: 0, week: 0, month: 0, all: 0 } as Record<string, number>;
    for (const c of calls) {
      if (inBucket(c.logged_at, "today")) b.today++;
      if (inBucket(c.logged_at, "week")) b.week++;
      if (inBucket(c.logged_at, "month")) b.month++;
      b.all++;
    }
    return b;
  }, [calls]);

  const breakdown = useMemo(() => {
    const groups: Record<"today" | "week" | "month" | "all", Record<string, number>> = {
      today: {}, week: {}, month: {}, all: {},
    };
    for (const c of calls) {
      (["today", "week", "month", "all"] as const).forEach(bk => {
        if (inBucket(c.logged_at, bk)) groups[bk][c.outcome] = (groups[bk][c.outcome] || 0) + 1;
      });
    }
    const format = (bk: "today" | "week" | "month" | "all") => {
      const total = buckets[bk] || 0;
      return Object.entries(groups[bk])
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => ({ k, v, pct: total ? Math.round((v / total) * 100) : 0 }));
    };
    return { today: format("today"), week: format("week"), month: format("month"), all: format("all") };
  }, [calls, buckets]);

  const contactLabel = (c: Contact) =>
    (c.full_name || "").trim() || c.phone || "(no name)";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <Phone className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Call Tracking</h1>
          <p className="text-sm text-muted-foreground">Log sales calls and track your outcomes.</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Calls" value={buckets.all} />
        <StatCard label="Today" value={buckets.today} />
        <StatCard label="This Week" value={buckets.week} />
        <StatCard label="This Month" value={buckets.month} />
      </div>

      {/* Log call form */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Log a Call</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Contact (optional)</label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{contactLabel(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Outcome</label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                <SelectContent>
                  {OUTCOMES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Notes about this call…" />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleLog} disabled={saving || !outcome}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
              Log Call
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Outcome breakdown */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Outcome Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            {(["today", "week", "month", "all"] as const).map(bk => (
              <div key={bk}>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  {bk === "all" ? "Total" : bk === "today" ? "Today" : bk === "week" ? "This Week" : "This Month"}
                </div>
                {breakdown[bk].length === 0 ? (
                  <div className="text-xs text-muted-foreground">No calls</div>
                ) : (
                  <ul className="space-y-1">
                    {breakdown[bk].map(row => (
                      <li key={row.k} className="flex justify-between text-sm">
                        <span className="text-foreground/80">{row.k}</span>
                        <span className="text-muted-foreground">{row.v} ({row.pct}%)</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent calls */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <div className="text-sm text-muted-foreground">No calls logged yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {calls.slice(0, 25).map(c => {
                const contact = contacts.find(k => k.id === c.contact_id);
                return (
                  <div key={c.id} className="py-2 flex items-start justify-between gap-3 text-sm">
                    <div>
                      <div className="font-medium text-foreground">{c.outcome}</div>
                      {contact && <div className="text-xs text-muted-foreground">{contactLabel(contact)}</div>}
                      {c.notes && <div className="text-xs text-muted-foreground mt-0.5">{c.notes}</div>}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(c.logged_at).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
