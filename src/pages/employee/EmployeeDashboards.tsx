import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CheckCircle2, Clock3, DollarSign, GraduationCap, PhoneCall, Target, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MotivationCarousel } from "@/components/training/MotivationCarousel";
import { CertificationStatusBlock } from "@/components/training/CertificationStatusBlock";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const today = new Date();
const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
const startOfWeek = new Date(startOfToday);
startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const iso = (date: Date) => date.toISOString();
const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(today);

function firstName(name?: string | null, email?: string | null) {
  return (name || email || "there").split(/[\s@]/)[0] || "there";
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof PhoneCall }) {
  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-xl p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">{title}</h2>
      {children}
    </Card>
  );
}

function EmptyLine({ label }: { label: string }) {
  return <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">{label}</div>;
}

function Header({ title }: { title: string }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{dateLabel}</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>
      </div>
    </div>
  );
}

function TrainingProgress({ trackKey }: { trackKey: "bdr" | "sdr" }) {
  const { user } = useWorkspace();
  const [state, setState] = useState({ pct: 0, current: "Start training track", modules: 0, complete: 0 });

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: track } = await supabase.from("nl_training_tracks").select("id").eq("track_key", trackKey).maybeSingle();
      if (!track) return;
      const [{ data: modules }, { data: progress }] = await Promise.all([
        supabase.from("nl_training_modules").select("id, module_title, module_number").eq("track_id", track.id).order("module_number"),
        supabase.from("nl_training_progress").select("module_id, status").eq("track_id", track.id).eq("user_id", user.id),
      ]);
      const done = new Set((progress || []).filter(p => p.status === "completed").map(p => p.module_id));
      const current = (modules || []).find(m => !done.has(m.id));
      const pct = modules?.length ? Math.round((done.size / modules.length) * 100) : 0;
      setState({ pct, current: current?.module_title || "Certification ready", modules: modules?.length || 0, complete: done.size });
    })();
  }, [trackKey, user?.id]);

  return (
    <SectionCard title="Training Progress">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">{trackKey.toUpperCase()} Training Track</p>
            <p className="text-xs text-muted-foreground mt-1">Current module: {state.current}</p>
          </div>
          <span className="text-xl font-bold text-primary">{state.pct}%</span>
        </div>
        <Progress value={state.pct} />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{state.complete} of {state.modules} modules complete</p>
          <Button asChild size="sm" className="gap-2">
            <Link to={`/employee/training/${trackKey}`}><GraduationCap className="h-4 w-4" /> Continue Training</Link>
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}

export function BDRDashboard() {
  const { user, employeeProfile } = useWorkspace();
  const [contacts, setContacts] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const name = employeeProfile?.full_name || user?.user_metadata?.full_name || user?.email;

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const owner = employeeProfile?.email || user.email;
      const [{ data: contactRows }, { data: activityRows }, { data: meetingRows }] = await Promise.all([
        supabase.from("crm_contacts").select("id, full_name, phone, contact_status, contact_owner").or(`contact_owner.eq.${owner},contact_owner.eq.${name}`).limit(12),
        supabase.from("crm_activities").select("id, activity_type, created_at").eq("created_by", user.id).gte("created_at", iso(startOfWeek)),
        supabase.from("sales_meetings").select("id, title, start_time, status, meeting_type").eq("assigned_salesman_user_id", user.id).gte("created_at", iso(startOfWeek)).order("start_time", { ascending: false }).limit(8),
      ]);
      setContacts(contactRows || []);
      setActivities(activityRows || []);
      setAppointments(meetingRows || []);
    })();
  }, [employeeProfile?.email, name, user?.email, user?.id]);

  const dialsToday = activities.filter(a => a.activity_type?.toLowerCase().includes("call") && new Date(a.created_at) >= startOfToday).length;
  const conversationsWeek = activities.filter(a => ["conversation", "call", "qualified_call"].some(k => a.activity_type?.toLowerCase().includes(k))).length;
  const bookedToday = appointments.filter(a => a.start_time && new Date(a.start_time) >= startOfToday).length;
  const bookingRate = conversationsWeek ? Math.round((appointments.length / conversationsWeek) * 100) : 0;

  return (
    <div className="space-y-6">
      <Header title={`Good morning, ${firstName(name, user?.email)}`} />
      <MotivationCarousel />
      <CertificationStatusBlock />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's Dials" value={dialsToday} icon={PhoneCall} />
        <StatCard label="Appointments Booked Today" value={bookedToday} icon={CalendarClock} />
        <StatCard label="Appointments Booked This Week" value={appointments.length} icon={CheckCircle2} />
        <StatCard label="Booking Rate This Week" value={`${bookingRate}%`} icon={TrendingUp} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <TrainingProgress trackKey="bdr" />
        <SectionCard title="Daily Targets">
          <div className="space-y-5">
            <div><div className="flex justify-between text-sm mb-2"><span>Dials</span><span>{dialsToday}/50</span></div><Progress value={Math.min((dialsToday / 50) * 100, 100)} /></div>
            <div><div className="flex justify-between text-sm mb-2"><span>Bookings</span><span>{bookedToday}/8</span></div><Progress value={Math.min((bookedToday / 8) * 100, 100)} /></div>
          </div>
        </SectionCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Today's Lead List">
          <div className="space-y-2">{contacts.length ? contacts.map(c => <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"><div><p className="text-sm font-medium">{c.full_name}</p><p className="text-xs text-muted-foreground">{c.phone || "No phone"} · {c.contact_status}</p></div><Button size="sm" variant="outline">Log Call</Button></div>) : <EmptyLine label="No assigned leads found." />}</div>
        </SectionCard>
        <SectionCard title="Appointments Booked">
          <div className="space-y-2">{appointments.length ? appointments.map(a => <div key={a.id} className="rounded-lg border border-border/60 bg-muted/20 p-3"><p className="text-sm font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{a.start_time ? new Date(a.start_time).toLocaleString() : "Time pending"} · {a.status}</p></div>) : <EmptyLine label="No appointments booked yet." />}</div>
        </SectionCard>
      </div>
    </div>
  );
}

export function SDRDashboard() {
  const { user, employeeProfile } = useWorkspace();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const name = employeeProfile?.full_name || user?.user_metadata?.full_name || user?.email;

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [{ data: meetingRows }, { data: dealRows }, { data: proposalRows }] = await Promise.all([
        supabase.from("sales_meetings").select("id, title, start_time, meeting_type, status, prospect_id, deal_id").eq("assigned_salesman_user_id", user.id).gte("start_time", iso(startOfWeek)).order("start_time").limit(12),
        supabase.from("crm_deals").select("id, deal_name, pipeline_stage, deal_value, updated_at, status").eq("assigned_operator_user_id", user.id).order("updated_at", { ascending: false }).limit(12),
        supabase.from("proposals").select("id, proposal_title, proposal_status, sent_at, accepted_at").eq("assigned_salesman_user_id", user.id).gte("created_at", iso(startOfMonth)),
      ]);
      setMeetings(meetingRows || []);
      setDeals(dealRows || []);
      setProposals(proposalRows || []);
    })();
  }, [user?.id]);

  const sentWeek = proposals.filter(p => p.sent_at && new Date(p.sent_at) >= startOfWeek).length;
  const closedMonth = proposals.filter(p => p.accepted_at || p.proposal_status === "accepted").length;
  const closeRate = meetings.length ? Math.round((closedMonth / meetings.length) * 100) : 0;
  const todaysMeetings = meetings.filter(m => m.start_time && new Date(m.start_time) >= startOfToday && new Date(m.start_time) < new Date(startOfToday.getTime() + 86400000));

  return (
    <div className="space-y-6">
      <Header title={`Good morning, ${firstName(name, user?.email)}`} />
      <MotivationCarousel />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Meetings This Week" value={meetings.length} icon={CalendarClock} />
        <StatCard label="Proposals Sent This Week" value={sentWeek} icon={Target} />
        <StatCard label="Deals Closed This Month" value={closedMonth} icon={DollarSign} />
        <StatCard label="Close Rate This Month" value={`${closeRate}%`} icon={TrendingUp} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <TrainingProgress trackKey="sdr" />
        <SectionCard title="Today's Meetings">
          <div className="space-y-2">{todaysMeetings.length ? todaysMeetings.map(m => <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"><div><p className="text-sm font-medium">{m.title}</p><p className="text-xs text-muted-foreground">{m.start_time ? new Date(m.start_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Time pending"} · {m.meeting_type}</p></div><Button size="sm" variant="outline">View Proposal</Button></div>) : <EmptyLine label="No meetings scheduled today." />}</div>
        </SectionCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Active Pipeline">
          <div className="space-y-2">{deals.length ? deals.map(d => <div key={d.id} className="rounded-lg border border-border/60 bg-muted/20 p-3"><p className="text-sm font-medium">{d.deal_name}</p><p className="text-xs text-muted-foreground">{d.pipeline_stage} · ${(d.deal_value || 0).toLocaleString()} · {new Date(d.updated_at).toLocaleDateString()}</p></div>) : <EmptyLine label="No assigned active deals found." />}</div>
        </SectionCard>
        <SectionCard title="Follow-Up Queue">
          <div className="space-y-2">{deals.length ? deals.slice(0, 6).map(d => <div key={d.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3"><div><p className="text-sm font-medium">{d.deal_name}</p><p className="text-xs text-muted-foreground">Priority follow-up · {d.pipeline_stage}</p></div><Clock3 className="h-4 w-4 text-primary" /></div>) : <EmptyLine label="No follow-ups due today." />}</div>
        </SectionCard>
      </div>
    </div>
  );
}

export function GenericEmployeeDashboard() {
  const { user, employeeProfile } = useWorkspace();
  const name = employeeProfile?.full_name || user?.user_metadata?.full_name || user?.email;
  return <div className="space-y-6"><Header title={`Good morning, ${firstName(name, user?.email)}`} /><SectionCard title="Employee Dashboard"><EmptyLine label="Your internal dashboard is ready. Role-specific widgets will appear here as your team workflow is configured." /></SectionCard></div>;
}

export function AccountManagerDashboard() {
  return <div className="space-y-6"><Header title="Account Manager Dashboard" /><SectionCard title="Workspace"><EmptyLine label="Account Manager tools are coming soon." /></SectionCard></div>;
}

export function SupportEmployeeDashboard() {
  return <div className="space-y-6"><Header title="Support Dashboard" /><SectionCard title="Support Queue"><EmptyLine label="Support staff dashboard placeholder is ready." /></SectionCard></div>;
}

export function EmployeePlaceholder({ title }: { title: string }) {
  return <div className="space-y-6"><Header title={title} /><SectionCard title="Coming Soon"><EmptyLine label="This employee-only section is available and will be connected to live workflow data next." /></SectionCard></div>;
}
