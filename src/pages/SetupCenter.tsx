import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Palette, Calendar, FileText, Users, Plug, Globe, Star, CreditCard,
  GraduationCap, CheckCircle2, Circle, ArrowRight, Rocket, ShoppingBag,
  ChevronRight, AlertCircle
} from "lucide-react";

type SectionStatus = "not_started" | "in_progress" | "needs_access" | "ready" | "completed";

interface SetupSection {
  key: string;
  title: string;
  description: string;
  icon: any;
  status: SectionStatus;
  link: string;
  details: string;
}

const statusMeta: Record<SectionStatus, { label: string; color: string; bg: string; icon: any }> = {
  not_started: { label: "Not Started", color: "hsl(var(--muted-foreground))", bg: "hsla(210,40%,94%,.6)", icon: Circle },
  in_progress: { label: "In Progress", color: "hsl(211 96% 56%)", bg: "hsla(211,96%,56%,.1)", icon: AlertCircle },
  needs_access: { label: "Needs Access", color: "hsl(38 92% 50%)", bg: "hsla(38,92%,50%,.1)", icon: AlertCircle },
  ready: { label: "Ready", color: "hsl(152 60% 44%)", bg: "hsla(152,60%,44%,.08)", icon: CheckCircle2 },
  completed: { label: "Completed", color: "hsl(152 60% 44%)", bg: "hsla(152,60%,44%,.12)", icon: CheckCircle2 },
};

export default function SetupCenter() {
  const { activeClientId, branding, userRole } = useWorkspace();
  const [sections, setSections] = useState<SetupSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) return;

    const evaluate = async () => {
      const [brandRes, calRes, formRes, formRes2, teamRes, intgRes, svcRes, onbRes, clientRes, faqRes, wcbRes, availRes, apptTypeRes, bookingLinkRes, calUsersRes, contactsRes, dealsRes, fuRes] = await Promise.all([
        supabase.from("client_branding").select("id, logo_url, primary_color").eq("client_id", activeClientId).maybeSingle(),
        supabase.from("calendars").select("id").eq("client_id", activeClientId),
        supabase.from("client_forms").select("id").eq("client_id", activeClientId),
        supabase.from("forms").select("id").eq("client_id", activeClientId),
        supabase.from("workspace_users").select("id").eq("client_id", activeClientId),
        supabase.from("client_integrations").select("status").eq("client_id", activeClientId),
        supabase.from("service_catalog" as any).select("id").eq("client_id", activeClientId),
        supabase.from("onboarding_progress").select("*").eq("client_id", activeClientId).maybeSingle(),
        supabase.from("clients").select("onboarding_stage").eq("id", activeClientId).single(),
        supabase.from("faq_records" as any).select("id").eq("client_id", activeClientId),
        supabase.from("website_content_blocks" as any).select("id").eq("client_id", activeClientId),
        supabase.from("calendar_availability").select("id").eq("client_id", activeClientId).eq("is_active", true),
        supabase.from("calendar_appointment_types").select("id").eq("client_id", activeClientId).eq("is_active", true),
        supabase.from("calendar_booking_links").select("id").eq("client_id", activeClientId).eq("is_active", true),
        supabase.from("calendar_users").select("id").eq("client_id", activeClientId),
        supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
        supabase.from("crm_deals").select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
        supabase.from("follow_up_queues" as any).select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
      ]);

      const hasBrand = !!(brandRes.data?.logo_url && brandRes.data?.primary_color && brandRes.data.primary_color !== "#3B82F6");
      const calCount = calRes.data?.length || 0;
      const formCount = (formRes.data?.length || 0) + (formRes2.data?.length || 0);
      const teamCount = teamRes.data?.length || 0;
      const svcCount = svcRes.data?.length || 0;
      const faqCount = faqRes.data?.length || 0;
      const wcbCount = wcbRes.data?.length || 0;
      const availCount = availRes.data?.length || 0;
      const apptTypeCount = apptTypeRes.data?.length || 0;
      const bookingLinkCount = bookingLinkRes.data?.length || 0;
      const calUsersCount = calUsersRes.data?.length || 0;
      const intgs = intgRes.data || [];
      const connectedIntgs = intgs.filter((i: any) => i.status === "connected").length;
      const needsAccess = intgs.some((i: any) => ["access_needed", "awaiting_client"].includes(i.status));
      const onb = onbRes.data;

      const s = (has: boolean, count?: number, threshold?: number): SectionStatus => {
        if (has || (count !== undefined && threshold !== undefined && count >= threshold)) return "completed";
        if (count !== undefined && count > 0) return "in_progress";
        return "not_started";
      };

      // Determine branding status more precisely
      const brandingHasLogo = !!brandRes.data?.logo_url;
      const brandingHasColor = !!(brandRes.data?.primary_color && brandRes.data.primary_color !== "#3B82F6");
      const brandingStatus: SectionStatus = hasBrand ? "completed" : (brandingHasLogo || brandingHasColor) ? "in_progress" : "not_started";

      // Calendar scheduling readiness — completed when all pieces are in place
      const calSetupParts = [calCount > 0, apptTypeCount > 0, availCount > 0, bookingLinkCount > 0];
      const calCompleted = calSetupParts.filter(Boolean).length;
      const calStatus: SectionStatus = calCompleted >= 4 ? "completed" : calCompleted > 0 ? "in_progress" : "not_started";
      const calDetails = calCount === 0
        ? "Create your first calendar"
        : calCompleted >= 4
          ? `${calCount} calendar(s), ${apptTypeCount} type(s), ${bookingLinkCount} link(s)`
          : `${calCount} calendar(s) — ${apptTypeCount === 0 ? "add appointment types" : availCount === 0 ? "set availability" : "create booking link"}`;

      setSections([
        { key: "branding", title: "Branding", description: "Logo, colors, and business identity", icon: Palette, status: brandingStatus, link: "/branding-settings", details: hasBrand ? "Brand configured" : brandingHasLogo ? "Add brand colors" : "Upload logo and set colors" },
        { key: "calendars", title: "Scheduling & Booking", description: "Calendars, appointment types, availability, and booking links", icon: Calendar, status: calStatus, link: "/calendar-management", details: calDetails },
        { key: "forms", title: "Booking Forms", description: "Intake, booking, and contact forms", icon: FileText, status: s(false, formCount, 1), link: "/forms", details: formCount > 0 ? `${formCount} form(s) created` : "Create your first form" },
        { key: "services", title: "Services & Products", description: "Manage your service and product catalog", icon: ShoppingBag, status: s(false, svcCount, 1), link: "/services", details: svcCount > 0 ? `${svcCount} service(s) listed${faqCount > 0 ? `, ${faqCount} FAQ(s)` : ""}` : "Add your services" },
        { key: "team", title: "Team & Staff", description: "Add team members and assign calendar roles", icon: Users, status: s(false, teamCount, 2), link: "/team", details: teamCount > 1 ? `${teamCount} team members${calUsersCount > 0 ? `, ${calUsersCount} calendar assignment(s)` : ""}` : "Invite your team" },
        { key: "integrations", title: "Integrations", description: "Connect Google, Meta, Stripe, and more", icon: Plug, status: needsAccess ? "needs_access" : s(false, connectedIntgs, 3), link: "/integrations", details: connectedIntgs > 0 ? `${connectedIntgs} connected` : "Connect your accounts" },
        { key: "website", title: "Website Content", description: "Pages, content blocks, and SEO", icon: Globe, status: s(false, wcbCount, 1), link: "/website", details: wcbCount > 0 ? `${wcbCount} content block(s)` : "Set up your website content" },
        { key: "reviews", title: "Reviews", description: "Review requests and reputation", icon: Star, status: onb?.review_platform_connected ? "completed" : "not_started", link: "/reviews", details: onb?.review_platform_connected ? "Review platform linked" : "Connect review platform" },
        { key: "billing", title: "Billing & Plan", description: "Subscription and payment status", icon: CreditCard, status: "ready", link: "/billing", details: "View your plan" },
        { key: "training", title: "Training & Help", description: "Courses and knowledge base", icon: GraduationCap, status: "ready", link: "/training", details: "Browse available courses" },
      ]);
      setLoading(false);
    };

    evaluate();
  }, [activeClientId]);

  const completedCount = sections.filter(s => s.status === "completed" || s.status === "ready").length;
  const totalCount = sections.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Role-based filtering
  const isStaff = userRole && !["admin", "operator", "client_owner", "workspace_admin", "manager"].includes(userRole);
  const staffKeys = ["calendars", "training"];
  const visibleSections = isStaff ? sections.filter(s => staffKeys.includes(s.key)) : sections;

  return (
    <div>
      <PageHeader title="Setup Center" description="Complete your workspace setup to unlock your full growth system" />

      {/* Overall Progress */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="mb-8 p-6 rounded-2xl border border-primary/10"
        style={{ background: "linear-gradient(135deg, hsla(211,96%,56%,.04), hsla(197,92%,58%,.02))" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.1)" }}>
              <Rocket className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">Workspace Setup</p>
              <p className="text-xs text-muted-foreground">{completedCount} of {totalCount} sections complete</p>
            </div>
          </div>
          <span className="text-3xl font-bold" style={{ color: "hsl(211 96% 56%)" }}>{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-2.5" />
      </motion.div>

      {/* Section Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleSections.map((section, i) => {
          const sm = statusMeta[section.status];
          const StatusIcon = sm.icon;
          return (
            <motion.div key={section.key}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card-widget group hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.08)" }}>
                  <section.icon className="h-5 w-5" style={{ color: "hsl(211 96% 56%)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-foreground">{section.title}</p>
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 shrink-0" style={{ color: sm.color, background: sm.bg, borderColor: "transparent" }}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {sm.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{section.description}</p>
                  <p className="text-[11px] text-muted-foreground/70 mb-3">{section.details}</p>
                  <Link to={section.link}>
                    <Button size="sm" variant={section.status === "completed" ? "outline" : "default"}
                      className={`h-7 text-[11px] gap-1 ${section.status !== "completed" ? "btn-gradient" : ""}`}>
                      {section.status === "completed" ? "Review" : section.status === "needs_access" ? "Fix Access" : "Set Up"}
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
