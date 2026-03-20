import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BackArrow } from "@/components/BackArrow";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Mail, Phone, MapPin, Building2, Tag, Activity,
  Calendar, Briefcase, Star, StickyNote, DollarSign,
  Clock, User, ArrowUpRight, MessageSquare, CheckCircle2,
  AlarmClock, SkipForward
} from "lucide-react";

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead", contacted: "Contacted", qualified: "Qualified",
  appointment_booked: "Appt Booked", proposal_sent: "Proposal Sent",
  negotiation: "Negotiation", closed_won: "Closed Won", closed_lost: "Closed Lost",
};

const STAGE_COLORS: Record<string, string> = {
  new_lead: "bg-blue-50 text-blue-700", contacted: "bg-cyan-50 text-cyan-700",
  qualified: "bg-emerald-50 text-emerald-700", appointment_booked: "bg-violet-50 text-violet-700",
  proposal_sent: "bg-amber-50 text-amber-700", negotiation: "bg-orange-50 text-orange-700",
  closed_won: "bg-green-50 text-green-700", closed_lost: "bg-red-50 text-red-600",
};

const STATUS_STYLE: Record<string, string> = {
  lead: "bg-blue-50 text-blue-700",
  customer: "bg-emerald-50 text-emerald-700",
  vip: "bg-amber-50 text-amber-700",
  inactive: "bg-muted text-muted-foreground",
  lost: "bg-red-50 text-red-600",
};

export default function ContactDetail() {
  const { contactId } = useParams();
  const navigate = useNavigate();
  const { activeClientId } = useWorkspace();
  const [contact, setContact] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contactId || !activeClientId) return;
    setLoading(true);
    Promise.all([
      supabase.from("crm_contacts").select("*").eq("id", contactId).single(),
      supabase.from("crm_activities").select("*").eq("client_id", activeClientId).eq("contact_id", contactId).order("created_at", { ascending: false }).limit(50),
      supabase.from("crm_deals").select("*").eq("client_id", activeClientId).eq("contact_id", contactId).order("created_at", { ascending: false }),
      supabase.from("appointments").select("*").eq("client_id", activeClientId).eq("contact_id", contactId).order("start_time", { ascending: false }),
      supabase.from("crm_notes").select("*").eq("client_id", activeClientId).eq("contact_id", contactId).order("created_at", { ascending: false }),
      supabase.from("email_messages").select("*").eq("client_id", activeClientId).eq("contact_id", contactId).order("created_at", { ascending: false }).limit(20),
      supabase.from("crm_tasks").select("*").eq("client_id", activeClientId).eq("related_id", contactId).order("created_at", { ascending: false }),
      supabase.from("review_requests" as any).select("*").eq("client_id", activeClientId).eq("contact_id", contactId).order("created_at", { ascending: false }),
      supabase.from("follow_up_queues" as any).select("*").eq("client_id", activeClientId).eq("related_id", contactId).order("created_at", { ascending: false }),
      supabase.from("conversations" as any).select("*").eq("client_id", activeClientId).eq("contact_id", contactId).order("last_message_at", { ascending: false }),
    ]).then(([c, a, d, ap, n, e, t, rv, fu, conv]) => {
      setContact(c.data);
      setActivities(a.data || []);
      setDeals(d.data || []);
      setAppointments(ap.data || []);
      setNotes(n.data || []);
      setEmails(e.data || []);
      setTasks(t.data || []);
      setReviews(rv.data || []);
      setFollowUps(fu.data || []);
      setConversations(conv.data || []);
      setLoading(false);
    });
  }, [contactId, activeClientId]);

  const addNote = async () => {
    if (!activeClientId || !contactId || !newNote.trim()) return;
    await supabase.from("crm_notes").insert({ client_id: activeClientId, contact_id: contactId, content: newNote } as any);
    await supabase.from("crm_activities").insert({
      client_id: activeClientId, activity_type: "note_added", contact_id: contactId,
      activity_note: `Note added: ${newNote.substring(0, 80)}`,
    } as any);
    setNewNote("");
    toast({ title: "Note added" });
    // Refetch notes & activities
    const [n, a] = await Promise.all([
      supabase.from("crm_notes").select("*").eq("client_id", activeClientId).eq("contact_id", contactId).order("created_at", { ascending: false }),
      supabase.from("crm_activities").select("*").eq("client_id", activeClientId).eq("contact_id", contactId).order("created_at", { ascending: false }).limit(50),
    ]);
    setNotes(n.data || []);
    setActivities(a.data || []);
  };

  if (loading || !contact) {
    return (
      <div>
        <BackArrow to="/crm" label="Back to CRM" dark={false} />
        <div className="py-12 text-center text-muted-foreground text-sm">{loading ? "Loading…" : "Contact not found"}</div>
      </div>
    );
  }

  const address = [contact.address, contact.city, contact.state, contact.zip].filter(Boolean).join(", ");

  return (
    <div>
      <BackArrow to="/crm" label="Back to CRM" dark={false} />

      {/* Header Card */}
      <div className="card-widget rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.1)" }}>
            <User className="h-7 w-7" style={{ color: "hsl(211 96% 56%)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-foreground">{contact.full_name}</h1>
              <Badge className={`text-[10px] ${STATUS_STYLE[contact.contact_status] || "bg-secondary text-muted-foreground"}`}>
                {contact.contact_status || "Lead"}
              </Badge>
              {contact.pipeline_stage && (
                <Badge className={`text-[10px] ${STAGE_COLORS[contact.pipeline_stage] || "bg-secondary text-muted-foreground"}`}>
                  {STAGE_LABELS[contact.pipeline_stage] || contact.pipeline_stage}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {contact.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{contact.email}</span>}
              {contact.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{contact.phone}</span>}
              {address && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{address}</span>}
            </div>
            {contact.tags?.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
                {contact.tags.map((t: string) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t}</span>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 shrink-0 text-center">
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-lg font-bold tabular-nums">{contact.lead_score || 0}</p>
              <p className="text-[10px] text-muted-foreground">Lead Score</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-lg font-bold tabular-nums">${Number(contact.lifetime_revenue || 0).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Revenue</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-secondary h-10 rounded-lg flex-wrap">
          <TabsTrigger value="overview" className="rounded-md text-sm">Overview</TabsTrigger>
          <TabsTrigger value="activity" className="rounded-md text-sm">Activity</TabsTrigger>
          <TabsTrigger value="appointments" className="rounded-md text-sm">Appointments</TabsTrigger>
          <TabsTrigger value="deals" className="rounded-md text-sm">Deals</TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-md text-sm">Tasks</TabsTrigger>
          <TabsTrigger value="emails" className="rounded-md text-sm">Emails</TabsTrigger>
          <TabsTrigger value="follow_ups" className="rounded-md text-sm">Follow-Ups</TabsTrigger>
          <TabsTrigger value="conversations" className="rounded-md text-sm">Conversations</TabsTrigger>
          <TabsTrigger value="notes" className="rounded-md text-sm">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DataCard title="Contact Info">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Lead Source", value: contact.lead_source },
                  { label: "Pipeline Stage", value: STAGE_LABELS[contact.pipeline_stage] || contact.pipeline_stage },
                  { label: "Customer Value", value: contact.customer_value ? `$${Number(contact.customer_value).toLocaleString()}` : "—" },
                  { label: "Lifetime Revenue", value: contact.lifetime_revenue ? `$${Number(contact.lifetime_revenue).toLocaleString()}` : "—" },
                  { label: "First Contact", value: contact.first_contact_date ? new Date(contact.first_contact_date).toLocaleDateString() : "—" },
                  { label: "Last Interaction", value: contact.last_interaction_date ? new Date(contact.last_interaction_date).toLocaleDateString() : "—" },
                  { label: "Appointments", value: String(contact.number_of_appointments || 0) },
                  { label: "Purchases", value: String(contact.number_of_purchases || 0) },
                ].map(f => (
                  <div key={f.label}>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{f.label}</p>
                    <p className="text-sm text-foreground mt-0.5">{f.value || "—"}</p>
                  </div>
                ))}
              </div>
            </DataCard>
            <DataCard title="Quick Stats">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-secondary/50 text-center">
                  <Briefcase className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{deals.length}</p>
                  <p className="text-[10px] text-muted-foreground">Deals</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/50 text-center">
                  <Calendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{appointments.length}</p>
                  <p className="text-[10px] text-muted-foreground">Appointments</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/50 text-center">
                  <Mail className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{emails.length}</p>
                  <p className="text-[10px] text-muted-foreground">Emails</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/50 text-center">
                  <StickyNote className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-bold">{notes.length}</p>
                  <p className="text-[10px] text-muted-foreground">Notes</p>
                </div>
              </div>
            </DataCard>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <DataCard title="Activity Timeline">
            {activities.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {activities.map((a, i) => (
                  <motion.div key={a.id} className="flex gap-3 py-2 border-b border-border last:border-0"
                    initial={{ opacity: 0, x: -4 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.02 }}>
                    <div className="h-2 w-2 rounded-full mt-2 shrink-0" style={{ background: "hsl(211 96% 56%)" }} />
                    <div>
                      <p className="text-sm">{a.activity_note || a.activity_type}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </DataCard>
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          {(() => {
            const now = new Date();
            const upcoming = appointments.filter(a => new Date(a.start_time) >= now && !["cancelled", "no_show", "completed"].includes(a.status));
            const past = appointments.filter(a => new Date(a.start_time) < now || ["cancelled", "no_show", "completed"].includes(a.status));

            const renderApptTable = (list: any[], label: string) => (
              <DataCard title={label} className={label === "Past Appointments" ? "mt-4" : ""}>
                {list.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No {label.toLowerCase()}.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b border-border">
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-3">Title</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-3">Date</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-3">Status</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-3">Source</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-3">Location</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3"></th>
                      </tr></thead>
                      <tbody>
                        {list.map(ap => (
                          <tr key={ap.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/appointments/${ap.id}`)}>
                            <td className="text-sm font-medium py-3 pr-3">{ap.title}</td>
                            <td className="text-sm text-muted-foreground py-3 pr-3 whitespace-nowrap">{new Date(ap.start_time).toLocaleString()}</td>
                            <td className="py-3 pr-3"><Badge variant="outline" className="text-[10px]">{ap.status}</Badge></td>
                            <td className="text-xs text-muted-foreground py-3 pr-3">{ap.booking_source || "—"}</td>
                            <td className="text-xs text-muted-foreground py-3 pr-3">{ap.location || "—"}</td>
                            <td className="py-3"><ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </DataCard>
            );

            return (
              <>
                {renderApptTable(upcoming, "Upcoming Appointments")}
                {renderApptTable(past, "Past Appointments")}
              </>
            );
          })()}

          {/* Review Requests linked to contact */}
          {reviews.length > 0 && (
            <DataCard title="Review Requests" className="mt-4">
              <div className="space-y-2">
                {reviews.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <Star className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-sm">{r.customer_name}</span>
                      {r.rating && <Badge variant="outline" className="text-[10px]">{r.rating}★</Badge>}
                    </div>
                    <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                  </div>
                ))}
              </div>
            </DataCard>
          )}
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <DataCard title="Deals">
            {deals.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No deals linked to this contact.</p>
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
                        <td className="py-3 pr-4"><Badge className={`text-[10px] ${STAGE_COLORS[d.pipeline_stage] || "bg-secondary text-muted-foreground"}`}>{STAGE_LABELS[d.pipeline_stage] || d.pipeline_stage}</Badge></td>
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

        <TabsContent value="tasks" className="mt-4">
          <DataCard title="Tasks">
            {tasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No tasks linked to this contact.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{t.title}</p>
                      {t.due_date && <p className="text-[10px] text-muted-foreground">Due: {new Date(t.due_date).toLocaleDateString()}</p>}
                    </div>
                    <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </DataCard>
        </TabsContent>

        <TabsContent value="emails" className="mt-4">
          <DataCard title="Email History">
            {emails.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No emails linked to this contact.</p>
            ) : (
              <div className="space-y-2">
                {emails.map(e => (
                  <div key={e.id} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                    <Mail className={`h-4 w-4 mt-0.5 shrink-0 ${e.direction === "inbound" ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{e.subject || "(no subject)"}</p>
                      <p className="text-xs text-muted-foreground">{e.direction === "inbound" ? "From" : "To"}: {e.direction === "inbound" ? e.from_address : e.to_address}</p>
                      <p className="text-[10px] text-muted-foreground">{e.sent_at ? new Date(e.sent_at).toLocaleString() : new Date(e.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DataCard>
        </TabsContent>

        <TabsContent value="follow_ups" className="mt-4">
          <DataCard title="Follow-Ups">
            {followUps.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No follow-ups linked to this contact.</p>
            ) : (
              <div className="space-y-2">
                {followUps.map((fu: any) => (
                  <div key={fu.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{fu.queue_type}</p>
                        {fu.notes && <p className="text-xs text-muted-foreground truncate">{fu.notes}</p>}
                        {fu.due_at && <p className="text-[10px] text-muted-foreground">Due: {new Date(fu.due_at).toLocaleDateString()}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">{fu.priority}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${fu.status === "Completed" ? "text-emerald-600" : fu.status === "Overdue" ? "text-red-600" : ""}`}>{fu.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DataCard>
        </TabsContent>

        <TabsContent value="conversations" className="mt-4">
          <DataCard title="Conversations">
            {conversations.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No conversations linked to this contact.</p>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv: any) => (
                  <div key={conv.id} className="flex items-center justify-between py-3 border-b border-border last:border-0 cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => navigate("/conversations")}>
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{conv.subject || "No subject"}</p>
                        <p className="text-[10px] text-muted-foreground">{conv.conversation_type} · {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : ""}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{conv.status}</Badge>
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
                    <p className="text-sm text-foreground whitespace-pre-wrap">{n.content}</p>
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
