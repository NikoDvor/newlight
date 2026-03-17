import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BackArrow } from "@/components/BackArrow";
import { DataCard } from "@/components/DataCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Building2, Globe, Phone, Mail, Users, Briefcase, StickyNote, Activity, DollarSign, Calendar, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function CompanyDetail() {
  const navigate = useNavigate();
  const { companyId } = useParams();
  const { activeClientId } = useWorkspace();
  const [company, setCompany] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId || !activeClientId) return;
    setLoading(true);
    Promise.all([
      supabase.from("crm_companies").select("*").eq("id", companyId).single(),
      supabase.from("crm_contacts").select("*").eq("client_id", activeClientId).eq("company_id", companyId).order("created_at", { ascending: false }),
      supabase.from("crm_deals").select("*").eq("client_id", activeClientId).eq("company_id", companyId).order("created_at", { ascending: false }),
      supabase.from("crm_activities").select("*").eq("client_id", activeClientId).eq("company_id", companyId).order("created_at", { ascending: false }).limit(30),
      supabase.from("crm_notes").select("*").eq("client_id", activeClientId).eq("company_id", companyId).order("created_at", { ascending: false }),
      supabase.from("appointments").select("*").eq("client_id", activeClientId).eq("company_id", companyId).order("start_time", { ascending: false }),
    ]).then(([co, c, d, a, n, ap]) => {
      setCompany(co.data);
      setContacts(c.data || []);
      setDeals(d.data || []);
      setActivities(a.data || []);
      setNotes(n.data || []);
      setAppointments(ap.data || []);
      setLoading(false);
    });
  }, [companyId, activeClientId]);

  const addNote = async () => {
    if (!activeClientId || !companyId || !newNote.trim()) return;
    await supabase.from("crm_notes").insert({ client_id: activeClientId, company_id: companyId, content: newNote } as any);
    setNewNote("");
    toast({ title: "Note added" });
    const n = await supabase.from("crm_notes").select("*").eq("client_id", activeClientId).eq("company_id", companyId).order("created_at", { ascending: false });
    setNotes(n.data || []);
  };

  if (loading || !company) {
    return (
      <div>
        <BackArrow to="/crm" label="Back to CRM" dark={false} />
        <div className="py-12 text-center text-muted-foreground text-sm">{loading ? "Loading…" : "Company not found"}</div>
      </div>
    );
  }

  const totalRevenue = deals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
  const address = [company.address, company.city, company.state, company.zip].filter(Boolean).join(", ");

  return (
    <div>
      <BackArrow to="/crm" label="Back to CRM" dark={false} />

      <div className="card-widget rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.1)" }}>
            <Building2 className="h-7 w-7" style={{ color: "hsl(211 96% 56%)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground mb-1">{company.company_name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {company.industry && <span>{company.industry}</span>}
              {company.website && <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{company.website}</span>}
              {company.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{company.phone}</span>}
              {company.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{company.email}</span>}
            </div>
            {address && <p className="text-xs text-muted-foreground mt-1">{address}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3 shrink-0 text-center">
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-lg font-bold">{contacts.length}</p>
              <p className="text-[10px] text-muted-foreground">Contacts</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-lg font-bold">{deals.length}</p>
              <p className="text-[10px] text-muted-foreground">Deals</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-lg font-bold tabular-nums">${totalRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Revenue</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="contacts" className="w-full">
        <TabsList className="bg-secondary h-10 rounded-lg flex-wrap">
          <TabsTrigger value="contacts" className="rounded-md text-sm">Contacts</TabsTrigger>
          <TabsTrigger value="deals" className="rounded-md text-sm">Deals</TabsTrigger>
          <TabsTrigger value="appointments" className="rounded-md text-sm">Appointments</TabsTrigger>
          <TabsTrigger value="activity" className="rounded-md text-sm">Activity</TabsTrigger>
          <TabsTrigger value="notes" className="rounded-md text-sm">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="mt-4">
          <DataCard title="Related Contacts">
            {contacts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No contacts linked to this company.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Email</th>
                    <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Phone</th>
                    <th className="text-left text-xs font-medium text-muted-foreground py-3">Status</th>
                  </tr></thead>
                  <tbody>
                    {contacts.map(c => (
                      <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer"
                        onClick={() => window.location.href = `/crm/contacts/${c.id}`}>
                        <td className="text-sm font-medium py-3 pr-4">{c.full_name}</td>
                        <td className="text-sm text-muted-foreground py-3 pr-4">{c.email || "—"}</td>
                        <td className="text-sm text-muted-foreground py-3 pr-4">{c.phone || "—"}</td>
                        <td className="py-3"><Badge variant="outline" className="text-[10px]">{c.contact_status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataCard>
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <DataCard title="Deals">
            {deals.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No deals linked to this company.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Deal</th>
                    <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Stage</th>
                    <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Value</th>
                    <th className="text-left text-xs font-medium text-muted-foreground py-3">Status</th>
                  </tr></thead>
                  <tbody>
                    {deals.map(d => (
                      <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                        <td className="text-sm font-medium py-3 pr-4">{d.deal_name}</td>
                        <td className="py-3 pr-4"><Badge variant="outline" className="text-[10px]">{d.pipeline_stage}</Badge></td>
                        <td className="text-sm tabular-nums py-3 pr-4">${Number(d.deal_value || 0).toLocaleString()}</td>
                        <td className="text-sm text-muted-foreground py-3">{d.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataCard>
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          <DataCard title="Appointments">
            {appointments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No appointments for this company.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Title</th>
                    <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground py-3">Status</th>
                  </tr></thead>
                  <tbody>
                    {appointments.map(ap => (
                      <tr key={ap.id} className="border-b border-border last:border-0">
                        <td className="text-sm font-medium py-3 pr-4">{ap.title}</td>
                        <td className="text-sm text-muted-foreground py-3 pr-4">{new Date(ap.start_time).toLocaleString()}</td>
                        <td className="py-3"><Badge variant="outline" className="text-[10px]">{ap.calendar_status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataCard>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <DataCard title="Activity Timeline">
            {activities.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {activities.map((a) => (
                  <div key={a.id} className="flex gap-3 py-2 border-b border-border last:border-0">
                    <div className="h-2 w-2 rounded-full mt-2 shrink-0" style={{ background: "hsl(211 96% 56%)" }} />
                    <div>
                      <p className="text-sm">{a.activity_note || a.activity_type}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DataCard>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <DataCard title="Notes">
            <div className="flex gap-2 mb-4">
              <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note…" className="min-h-[44px] flex-1 resize-none" rows={2} />
              <Button size="icon" className="shrink-0 self-end" onClick={addNote} disabled={!newNote.trim()}>
                <StickyNote className="h-4 w-4" />
              </Button>
            </div>
            {notes.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              <div className="space-y-3">
                {notes.map((n: any) => (
                  <div key={n.id} className="p-3 rounded-xl bg-secondary/50 border border-border">
                    <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </DataCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
