import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Heart, CheckCircle2, Circle, Headphones, BookOpen, GraduationCap,
  ArrowRight, Zap, Upload, Users, Calendar, Star, Plug, CreditCard,
  Settings2, FileText, HelpCircle
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";

const MILESTONE_DEFS = [
  { key: "workspace_activated", name: "Workspace Activated", icon: Zap, link: "/setup-center" },
  { key: "branding_complete", name: "Branding Complete", icon: Upload, link: "/branding-settings" },
  { key: "first_calendar_live", name: "First Calendar Live", icon: Calendar, link: "/calendar-management" },
  { key: "first_form_live", name: "First Form Published", icon: FileText, link: "/forms" },
  { key: "first_booking_received", name: "First Booking Received", icon: Calendar, link: "/calendar" },
  { key: "first_review_received", name: "First Review Received", icon: Star, link: "/reviews" },
  { key: "first_team_member_added", name: "First Team Member Added", icon: Users, link: "/team" },
  { key: "first_training_completed", name: "First Training Completed", icon: GraduationCap, link: "/training" },
  { key: "first_invoice_paid", name: "First Invoice Paid", icon: CreditCard, link: "/billing" },
  { key: "external_calendar_connected", name: "External Calendar Connected", icon: Plug, link: "/calendar-integrations" },
];

export default function ClientSuccessCenter() {
  const { activeClientId } = useWorkspace();
  const [milestones, setMilestones] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [healthRecord, setHealthRecord] = useState<any>(null);

  useEffect(() => {
    if (!activeClientId) return;
    Promise.all([
      supabase.from("client_success_milestones" as any).select("*").eq("client_id", activeClientId),
      supabase.from("support_tickets" as any).select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(10),
      supabase.from("client_health_records" as any).select("*").eq("client_id", activeClientId).order("calculated_at", { ascending: false }).limit(1).maybeSingle(),
    ]).then(([m, t, h]) => {
      setMilestones(m.data ?? []);
      setTickets(t.data ?? []);
      setHealthRecord(h.data);
    });
  }, [activeClientId]);

  const milestoneMap = new Map(milestones.map(m => [m.milestone_key, m]));
  const completedCount = milestones.filter(m => m.milestone_status === "Completed").length;
  const progress = MILESTONE_DEFS.length > 0 ? Math.round((completedCount / MILESTONE_DEFS.length) * 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader title="Success Center" subtitle="Track your progress, get help, and stay on track" />

      {/* Health + Progress */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> Account Health</CardTitle></CardHeader>
          <CardContent>
            {healthRecord ? (
              <div className="space-y-2">
                <p className="text-4xl font-bold text-foreground">{healthRecord.health_score_total}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: "Adoption", val: healthRecord.adoption_score },
                    { label: "Engagement", val: healthRecord.engagement_score },
                    { label: "Billing", val: healthRecord.billing_health_score },
                    { label: "Bookings", val: healthRecord.booking_health_score },
                  ].map(s => (
                    <div key={s.label} className="flex justify-between bg-secondary/50 rounded px-2 py-1">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="font-semibold text-foreground">{s.val ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Heart className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Your health score will appear here as you use the platform.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Setup Progress</CardTitle></CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">{progress}%</p>
            <Progress value={progress} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-2">{completedCount} of {MILESTONE_DEFS.length} milestones completed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="milestones" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="help">Help & Training</TabsTrigger>
        </TabsList>

        {/* MILESTONES */}
        <TabsContent value="milestones" className="space-y-2">
          {MILESTONE_DEFS.map(def => {
            const record = milestoneMap.get(def.key);
            const done = record?.milestone_status === "Completed";
            const Icon = def.icon;
            return (
              <motion.div key={def.key} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
                <Card className={`border-border ${done ? "bg-emerald-50/30" : ""}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    {done ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" /> : <Circle className="h-5 w-5 text-muted-foreground shrink-0" />}
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className={`text-sm flex-1 ${done ? "text-muted-foreground line-through" : "text-foreground font-medium"}`}>{def.name}</span>
                    {!done && (
                      <Link to={def.link}>
                        <Button size="sm" variant="outline" className="text-xs h-7">
                          Complete <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </TabsContent>

        {/* SUPPORT */}
        <TabsContent value="support" className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold text-foreground">Your Tickets</p>
            <Link to="/help-desk"><Button size="sm" variant="outline">Open Help Desk <ArrowRight className="h-3 w-3 ml-1" /></Button></Link>
          </div>
          {tickets.length === 0 ? (
            <Card className="border-border"><CardContent className="p-6 text-center">
              <Headphones className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No support tickets yet. Head to the Help Desk to submit a request.</p>
            </CardContent></Card>
          ) : tickets.map(t => (
            <Card key={t.id} className="border-border">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.ticket_subject}</p>
                  <p className="text-xs text-muted-foreground">{t.ticket_category} · {t.ticket_priority}</p>
                </div>
                <Badge variant="outline">{t.ticket_status}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* HELP */}
        <TabsContent value="help" className="space-y-3">
          {[
            { title: "Knowledge Base", desc: "Search articles and guides", icon: BookOpen, link: "/knowledge-base" },
            { title: "Training Courses", desc: "Complete your assigned training", icon: GraduationCap, link: "/training" },
            { title: "How It Works", desc: "Learn how the platform works", icon: HelpCircle, link: "/how-it-works" },
            { title: "Setup Center", desc: "Continue setting up your workspace", icon: Settings2, link: "/setup-center" },
          ].map(item => (
            <Link key={item.link} to={item.link}>
              <Card className="border-border hover:bg-accent/30 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
