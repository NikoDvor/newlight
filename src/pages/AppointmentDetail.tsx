import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { BackArrow } from "@/components/BackArrow";
import { DataCard } from "@/components/DataCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Calendar, User, Building2, MapPin, Clock, CheckCircle, XCircle,
  AlertTriangle, RefreshCw, Star, ArrowUpRight, Activity
} from "lucide-react";
import {
  confirmAppointment, completeAppointment, cancelAppointment,
  rescheduleAppointment, markNoShow,
} from "@/lib/appointmentLifecycle";

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700",
  confirmed: "bg-cyan-50 text-cyan-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-600",
  rescheduled: "bg-amber-50 text-amber-700",
  no_show: "bg-orange-50 text-orange-700",
};

export default function AppointmentDetail() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { activeClientId } = useWorkspace();
  const [appt, setAppt] = useState<any>(null);
  const [contact, setContact] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [calendarName, setCalendarName] = useState("");
  const [typeName, setTypeName] = useState("");
  const [activities, setActivities] = useState<any[]>([]);
  const [reviewRequests, setReviewRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Reschedule dialog
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const fetchAll = async () => {
    if (!appointmentId || !activeClientId) return;
    setLoading(true);
    const { data: a } = await supabase.from("appointments").select("*").eq("id", appointmentId).single();
    if (!a) { setLoading(false); return; }
    setAppt(a);

    const promises: Promise<any>[] = [
      supabase.from("crm_activities").select("*").eq("client_id", activeClientId)
        .eq("related_id", appointmentId).order("created_at", { ascending: false }).limit(20),
      supabase.from("calendars").select("calendar_name").eq("id", a.calendar_id).maybeSingle(),
    ];
    if (a.contact_id) promises.push(supabase.from("crm_contacts").select("full_name, email, phone, id").eq("id", a.contact_id).maybeSingle());
    if (a.company_id) promises.push(supabase.from("crm_companies").select("company_name, id").eq("id", a.company_id).maybeSingle());
    if (a.appointment_type_id) promises.push(supabase.from("calendar_appointment_types").select("name").eq("id", a.appointment_type_id).maybeSingle());
    promises.push(supabase.from("review_requests" as any).select("*").eq("appointment_id", appointmentId));

    const results = await Promise.all(promises);
    setActivities(results[0].data || []);
    setCalendarName(results[1].data?.calendar_name || "");
    let idx = 2;
    if (a.contact_id) { setContact(results[idx]?.data || null); idx++; }
    if (a.company_id) { setCompany(results[idx]?.data || null); idx++; }
    if (a.appointment_type_id) { setTypeName(results[idx]?.data?.name || ""); idx++; }
    setReviewRequests(results[idx]?.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [appointmentId, activeClientId]);

  const doAction = async (fn: () => Promise<void>, label: string) => {
    setActionLoading(true);
    try {
      await fn();
      toast({ title: label });
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime || !appt || !activeClientId) return;
    const start = new Date(`${newDate}T${newTime}`);
    const durationMs = new Date(appt.end_time).getTime() - new Date(appt.start_time).getTime();
    const end = new Date(start.getTime() + durationMs);
    await doAction(
      () => rescheduleAppointment(activeClientId, appt, start.toISOString(), end.toISOString(), rescheduleReason),
      "Appointment rescheduled",
    );
    setRescheduleOpen(false);
  };

  const handleCancel = async () => {
    if (!appt || !activeClientId) return;
    await doAction(() => cancelAppointment(activeClientId, appt, cancelReason), "Appointment cancelled");
    setCancelOpen(false);
  };

  if (loading || !appt) {
    return (
      <div>
        <BackArrow to="/calendar" label="Back to Calendar" dark={false} />
        <div className="py-12 text-center text-muted-foreground text-sm">{loading ? "Loading…" : "Appointment not found"}</div>
      </div>
    );
  }

  const isPast = new Date(appt.end_time) < new Date();
  const canConfirm = appt.status === "scheduled";
  const canComplete = ["scheduled", "confirmed"].includes(appt.status);
  const canCancel = !["cancelled", "completed", "no_show"].includes(appt.status);
  const canReschedule = !["cancelled", "completed", "no_show"].includes(appt.status);
  const canNoShow = isPast && !["cancelled", "completed", "no_show"].includes(appt.status);

  return (
    <div>
      <BackArrow to="/calendar" label="Back to Calendar" dark={false} />

      {/* Header */}
      <div className="card-widget rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.1)" }}>
            <Calendar className="h-7 w-7" style={{ color: "hsl(211 96% 56%)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-foreground">{appt.title}</h1>
              <Badge className={`text-[10px] ${STATUS_STYLE[appt.status] || "bg-secondary text-muted-foreground"}`}>
                {appt.status}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{new Date(appt.start_time).toLocaleString()}</span>
              {appt.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{appt.location}</span>}
              {calendarName && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{calendarName}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {canConfirm && <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => doAction(() => confirmAppointment(activeClientId!, appt), "Confirmed")}><CheckCircle className="h-3.5 w-3.5 mr-1" />Confirm</Button>}
            {canComplete && <Button size="sm" disabled={actionLoading} onClick={() => doAction(() => completeAppointment(activeClientId!, appt), "Completed")}><CheckCircle className="h-3.5 w-3.5 mr-1" />Complete</Button>}
            {canReschedule && <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => setRescheduleOpen(true)}><RefreshCw className="h-3.5 w-3.5 mr-1" />Reschedule</Button>}
            {canCancel && <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => setCancelOpen(true)}><XCircle className="h-3.5 w-3.5 mr-1" />Cancel</Button>}
            {canNoShow && <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => doAction(() => markNoShow(activeClientId!, appt), "No-show marked")}><AlertTriangle className="h-3.5 w-3.5 mr-1" />No Show</Button>}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <DataCard title="Appointment Details">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Type", value: typeName || "—" },
              { label: "Status", value: appt.status },
              { label: "Start", value: new Date(appt.start_time).toLocaleString() },
              { label: "End", value: new Date(appt.end_time).toLocaleString() },
              { label: "Timezone", value: appt.timezone || "—" },
              { label: "Location", value: appt.location || "—" },
              { label: "Booking Source", value: appt.booking_source || "—" },
              { label: "Calendar", value: calendarName || "—" },
            ].map(f => (
              <div key={f.label}>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{f.label}</p>
                <p className="text-sm text-foreground mt-0.5">{f.value}</p>
              </div>
            ))}
          </div>
          {appt.description && <div className="mt-4 pt-3 border-t border-border"><p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Description</p><p className="text-sm text-foreground">{appt.description}</p></div>}
          {appt.customer_notes && <div className="mt-3"><p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Customer Notes</p><p className="text-sm text-foreground">{appt.customer_notes}</p></div>}
          {appt.internal_notes && <div className="mt-3"><p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Internal Notes</p><p className="text-sm text-foreground">{appt.internal_notes}</p></div>}
          {appt.cancellation_reason && <div className="mt-3"><p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Cancellation Reason</p><p className="text-sm text-red-600">{appt.cancellation_reason}</p></div>}
          {appt.reschedule_reason && <div className="mt-3"><p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Reschedule Reason</p><p className="text-sm text-amber-700">{appt.reschedule_reason}</p></div>}
        </DataCard>

        <div className="space-y-4">
          {/* Contact Card */}
          <DataCard title="Contact">
            {contact ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{contact.full_name}</p>
                  {contact.email && <p className="text-xs text-muted-foreground">{contact.email}</p>}
                  {contact.phone && <p className="text-xs text-muted-foreground">{contact.phone}</p>}
                </div>
                <Link to={`/crm/contacts/${contact.id}`}>
                  <Button size="sm" variant="outline"><ArrowUpRight className="h-3.5 w-3.5 mr-1" />View</Button>
                </Link>
              </div>
            ) : <p className="text-sm text-muted-foreground">No contact linked</p>}
          </DataCard>

          {/* Company Card */}
          {company && (
            <DataCard title="Company">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{company.company_name}</p>
                <Link to={`/crm/companies/${company.id}`}>
                  <Button size="sm" variant="outline"><ArrowUpRight className="h-3.5 w-3.5 mr-1" />View</Button>
                </Link>
              </div>
            </DataCard>
          )}

          {/* Review Requests */}
          <DataCard title="Review Requests">
            {reviewRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No review requests linked.</p>
            ) : (
              <div className="space-y-2">
                {reviewRequests.map((r: any) => (
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
            )}
          </DataCard>
        </div>
      </div>

      {/* Activity Timeline */}
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

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reschedule Appointment</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
            <Textarea placeholder="Reason (optional)" value={rescheduleReason} onChange={e => setRescheduleReason(e.target.value)} rows={2} />
            <Button className="w-full" onClick={handleReschedule} disabled={!newDate || !newTime || actionLoading}>Reschedule</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel Appointment</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Textarea placeholder="Reason (optional)" value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={2} />
            <Button variant="destructive" className="w-full" onClick={handleCancel} disabled={actionLoading}>Confirm Cancellation</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
