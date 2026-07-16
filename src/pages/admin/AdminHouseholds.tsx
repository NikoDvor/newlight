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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CalendarCheck, Home, Plus, Search, Users } from "lucide-react";

type Cadence = "quarterly" | "semi_annual" | "annual";
type Role = "head_of_household" | "spouse" | "dependent" | "beneficiary" | "other";

interface Household {
  id: string; client_id: string; household_name: string;
  primary_advisor_user_id: string | null;
  review_cadence: Cadence;
  last_review_completed_at: string | null;
  next_review_due_at: string | null;
  created_at: string;
}
interface Member {
  id: string; household_id: string; contact_id: string;
  relationship_role: Role;
}
interface Contact { id: string; full_name: string; household_id: string | null; date_of_birth?: string | null; milestone_alerts_fired?: string[] | null; }

type UpcomingRow =
  | { kind: "review"; id: string; label: string; when: Date; sub: string; notified?: boolean }
  | { kind: "milestone"; id: string; label: string; when: Date; sub: string; notified?: boolean };

const MILESTONE_DEFS: Array<{ code: string; years: number; months: number; label: string }> = [
  { code: "59_5",         years: 59, months: 6, label: "Age 59½ — penalty-free withdrawals" },
  { code: "62_ss_window", years: 62, months: 0, label: "Social Security window opens (62)" },
  { code: "65_medicare",  years: 65, months: 0, label: "Medicare enrollment (65)" },
  { code: "73_rmd",       years: 73, months: 0, label: "RMD age (73)" },
];

const CADENCE_LABEL: Record<Cadence, string> = {
  quarterly: "Quarterly", semi_annual: "Semi-Annual", annual: "Annual",
};
const ROLE_LABEL: Record<Role, string> = {
  head_of_household: "Head of Household", spouse: "Spouse",
  dependent: "Dependent", beneficiary: "Beneficiary", other: "Other",
};

function reviewStatus(next: string | null): { label: string; cls: string } {
  if (!next) return { label: "—", cls: "bg-slate-500/15 text-slate-300 border-slate-500/30" };
  const days = Math.floor((new Date(next).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `Overdue ${-days}d`, cls: "bg-red-500/15 text-red-300 border-red-500/30" };
  if (days <= 30) return { label: `Due in ${days}d`, cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
  return { label: new Date(next).toLocaleDateString(), cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
}

export default function AdminHouseholds() {
  const { activeClientId } = useWorkspace();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ household_name: "", review_cadence: "annual" as Cadence });

  const [addContactId, setAddContactId] = useState("");
  const [addRole, setAddRole] = useState<Role>("other");

  const load = async () => {
    if (!activeClientId) return;
    setLoading(true);
    const [{ data: h }, { data: c }] = await Promise.all([
      supabase.from("households").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("crm_contacts").select("id, full_name, household_id, date_of_birth, milestone_alerts_fired").eq("client_id", activeClientId).order("full_name"),
    ]);
    const list = (h as any[]) ?? [];
    setHouseholds(list);
    setContacts((c as any[]) ?? []);
    if (list.length > 0) {
      const { data: mem } = await supabase
        .from("household_members")
        .select("household_id")
        .in("household_id", list.map((x) => x.id));
      const counts: Record<string, number> = {};
      for (const m of (mem as any[]) ?? []) counts[m.household_id] = (counts[m.household_id] ?? 0) + 1;
      setMemberCounts(counts);
    } else {
      setMemberCounts({});
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [activeClientId]);

  const openHousehold = async (h: Household) => {
    setSelected(h);
    const { data } = await supabase.from("household_members").select("*").eq("household_id", h.id);
    setMembers((data as any[]) ?? []);
  };

  const filtered = useMemo(
    () => households.filter((h) => !search || h.household_name.toLowerCase().includes(search.toLowerCase())),
    [households, search],
  );

  const upcoming = useMemo<UpcomingRow[]>(() => {
    const now = new Date();
    const horizon = new Date(now.getTime() + 90 * 86400000);
    const rows: UpcomingRow[] = [];

    for (const h of households) {
      if (!h.next_review_due_at) continue;
      const when = new Date(h.next_review_due_at);
      if (when <= horizon) {
        const days = Math.round((when.getTime() - now.getTime()) / 86400000);
        rows.push({
          kind: "review", id: `r-${h.id}`, when,
          label: h.household_name,
          sub: days < 0 ? `Overdue ${-days}d` : `Review in ${days}d`,
        });
      }
    }
    for (const c of contacts) {
      if (!c.date_of_birth) continue;
      const dob = new Date(c.date_of_birth);
      for (const m of MILESTONE_DEFS) {
        const when = new Date(dob);
        when.setFullYear(when.getFullYear() + m.years);
        when.setMonth(when.getMonth() + m.months);
        if (when >= now && when <= horizon) {
          const days = Math.round((when.getTime() - now.getTime()) / 86400000);
          rows.push({
            kind: "milestone", id: `m-${c.id}-${m.code}`, when,
            label: `${c.full_name} — ${m.label}`,
            sub: `In ${days}d`,
          });
        }
      }
    }
    return rows.sort((a, b) => a.when.getTime() - b.when.getTime()).slice(0, 20);
  }, [households, contacts]);

  const createHousehold = async () => {
    if (!activeClientId || !newForm.household_name.trim()) { toast.error("Name required"); return; }
    const { error } = await supabase.from("households").insert({
      client_id: activeClientId,
      household_name: newForm.household_name.trim(),
      review_cadence: newForm.review_cadence,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Household created");
    setShowNew(false);
    setNewForm({ household_name: "", review_cadence: "annual" });
    load();
  };

  const addMember = async () => {
    if (!selected || !addContactId) { toast.error("Pick a contact"); return; }
    const { error } = await supabase.from("household_members").insert({
      household_id: selected.id, contact_id: addContactId, relationship_role: addRole,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Member added");
    setAddContactId(""); setAddRole("other");
    openHousehold(selected); load();
  };

  const removeMember = async (m: Member) => {
    const { error } = await supabase.from("household_members").delete().eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Member removed");
    if (selected) openHousehold(selected);
    load();
  };

  const completeReview = async () => {
    if (!selected) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from("households")
      .update({ last_review_completed_at: now } as any)
      .eq("id", selected.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Review marked complete — next due date recomputed");
    const { data } = await supabase.from("households").select("*").eq("id", selected.id).single();
    if (data) setSelected(data as any);
    load();
  };

  const availableContacts = useMemo(
    () => contacts.filter((c) => !c.household_id || (selected && c.household_id === selected.id)),
    [contacts, selected],
  );

  const contactName = (id: string) => contacts.find((c) => c.id === id)?.full_name ?? "—";

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Households & Relationships"
        description="Group contacts into family units — track spouses, dependents, beneficiaries, and review cadence."
      >
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Household</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>New Household</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Household Name</Label>
                <Input value={newForm.household_name}
                  onChange={(e) => setNewForm({ ...newForm, household_name: e.target.value })}
                  placeholder="The Smith Family" />
              </div>
              <div>
                <Label>Review Cadence</Label>
                <Select value={newForm.review_cadence}
                  onValueChange={(v) => setNewForm({ ...newForm, review_cadence: v as Cadence })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CADENCE_LABEL).map(([k, v]) =>
                      <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button onClick={createHousehold}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Households", value: households.length, Icon: Home },
          { label: "Overdue Reviews", value: households.filter((h) => h.next_review_due_at && new Date(h.next_review_due_at) < new Date()).length, Icon: CalendarCheck },
          { label: "Total Members", value: Object.values(memberCounts).reduce((s, v) => s + v, 0), Icon: Users },
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

      <Card className="border-border bg-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Upcoming Milestones & Reviews (next 90d)</h3>
            <Badge variant="outline">{upcoming.length}</Badge>
          </div>
          {upcoming.length === 0 ? (
            <div className="text-xs text-muted-foreground">Nothing due in the next 90 days.</div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {upcoming.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={u.kind === "review"
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      : "bg-blue-500/15 text-blue-300 border-blue-500/30"}>
                      {u.kind === "review" ? "Review" : "Milestone"}
                    </Badge>
                    <span className="text-foreground">{u.label}</span>
                  </div>
                  <div className="text-muted-foreground">{u.sub} · {u.when.toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search households…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Household</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Cadence</TableHead>
                <TableHead>Next Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No households yet.</TableCell></TableRow>
              ) : filtered.map((h) => {
                const rs = reviewStatus(h.next_review_due_at);
                return (
                  <TableRow key={h.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openHousehold(h)}>
                    <TableCell className="font-medium">{h.household_name}</TableCell>
                    <TableCell className="text-muted-foreground">{memberCounts[h.id] ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground">{CADENCE_LABEL[h.review_cadence]}</TableCell>
                    <TableCell><Badge variant="outline" className={rs.cls}>{rs.label}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.household_name}</SheetTitle>
                <SheetDescription>
                  <Badge variant="outline" className="mr-2">{CADENCE_LABEL[selected.review_cadence]}</Badge>
                  <Badge variant="outline" className={reviewStatus(selected.next_review_due_at).cls}>
                    {reviewStatus(selected.next_review_due_at).label}
                  </Badge>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={completeReview}>
                    <CalendarCheck className="h-4 w-4 mr-1" />Mark Review Complete
                  </Button>
                </div>

                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Members ({members.length})</h3>
                  {members.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No members yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {members.map((m) => (
                        <div key={m.id} className="flex items-center justify-between rounded-md border border-border bg-muted/20 p-2 text-xs">
                          <div>
                            <span className="font-medium text-foreground">{contactName(m.contact_id)}</span>
                            <Badge variant="outline" className="ml-2">{ROLE_LABEL[m.relationship_role]}</Badge>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => removeMember(m)}>Remove</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-md border border-border p-3 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Add Member</h3>
                  <div className="space-y-2">
                    <Label>Contact</Label>
                    <Select value={addContactId} onValueChange={setAddContactId}>
                      <SelectTrigger><SelectValue placeholder="Select a contact" /></SelectTrigger>
                      <SelectContent>
                        {availableContacts
                          .filter((c) => !members.some((m) => m.contact_id === c.id))
                          .map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Relationship Role</Label>
                    <Select value={addRole} onValueChange={(v) => setAddRole(v as Role)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABEL).map(([k, v]) =>
                          <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={addMember}>Add to Household</Button>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
