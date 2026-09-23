import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Brain,
  Building2,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  FileSignature,
  FileText,
  Footprints,
  FormInput,
  Globe,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Megaphone,
  MessageSquare,
  Phone,
  Search,
  Share2,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import newlightLogo from "@/assets/newlight-logo.jpg";
import { useWorkspacePermissions } from "@/hooks/useWorkspacePermissions";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  moduleKey?: string;
  salesTeamOnly?: boolean;
}

interface NavModule {
  title: string;
  subtitle: string;
  icon: typeof LayoutDashboard;
  url?: string;
  moduleKey?: string;
  items?: NavItem[];
}

const navStructure: NavModule[] = [
  {
    title: "Dashboard",
    subtitle: "A clear view of your business today.",
    icon: LayoutDashboard,
    url: "/dashboard",
  },
  {
    title: "AI Insights",
    subtitle: "AI-surfaced opportunities and research about your business.",
    icon: Sparkles,
    items: [
      { title: "AI Insights", url: "/ai-insights", icon: Sparkles, moduleKey: "ai" },
      { title: "Reviews", url: "/reviews", icon: Star, moduleKey: "reviews" },
      { title: "Market Research", url: "/market-research", icon: Search, moduleKey: "reports" },
      { title: "Competitor Tracking", url: "/competitor-tracking", icon: TrendingUp, moduleKey: "reports" },
      { title: "Meeting Intelligence", url: "/meeting-intelligence", icon: MessageSquare, moduleKey: "meeting_intel" },
      { title: "Automation Workflows", url: "/automations", icon: Workflow, moduleKey: "intelligence" },
      { title: "Signed Documents", url: "/documents", icon: FileSignature },
    ],
  },
  {
    title: "AI Growth Advisor",
    subtitle: "Your AI-generated growth strategy and roadmap.",
    icon: Brain,
    items: [
      { title: "Growth Advisor", url: "/growth-advisor", icon: Brain, moduleKey: "ai" },
      { title: "Revenue Expansion", url: "/revenue-expansion", icon: TrendingUp, moduleKey: "intelligence" },
    ],
  },
  {
    title: "Client Acquisition",
    subtitle: "Finding and generating new leads.",
    icon: Target,
    items: [
      { title: "Lead Sourcing", url: "/bdr-lead-sourcing", icon: Search, moduleKey: "crm", salesTeamOnly: true },
      { title: "Dialer", url: "/bdr-dialer", icon: Phone, moduleKey: "crm", salesTeamOnly: true },
      { title: "Street Walk", url: "/bdr-street-walk", icon: MapPin, moduleKey: "crm", salesTeamOnly: true },
      { title: "Referral Program", url: "/referral-program", icon: Users, moduleKey: "intelligence" },
      { title: "Lifecycle & Nurture", url: "/lifecycle-nurture", icon: Workflow, moduleKey: "intelligence" },
    ],
  },
  {
    title: "Pipeline",
    subtitle: "Every deal, from first contact to close.",
    icon: BarChart3,
    items: [
      { title: "Deals Kanban", url: "/pipeline", icon: BarChart3, moduleKey: "crm" },
      { title: "Tasks", url: "/tasks", icon: ListChecks },
      { title: "Approvals", url: "/approvals", icon: CheckCircle, moduleKey: "approvals" },
    ],
  },
  {
    title: "CRM",
    subtitle: "Your system of record.",
    icon: Building2,
    items: [
      { title: "Contacts", url: "/crm", icon: Users, moduleKey: "crm" },
      { title: "Companies", url: "/crm?view=companies", icon: Building2, moduleKey: "crm" },
      { title: "AI Calendar", url: "/calendar", icon: Calendar, moduleKey: "calendar" },
      { title: "Call Tracking", url: "/call-tracking", icon: Phone, moduleKey: "crm" },
    ],
  },
  {
    title: "Growth Systems",
    subtitle: "Your marketing channels in one place.",
    icon: TrendingUp,
    items: [
      { title: "Website", url: "/website", icon: Globe, moduleKey: "website" },
      { title: "SEO", url: "/seo", icon: Search, moduleKey: "seo" },
      { title: "Ads", url: "/paid-ads", icon: Megaphone, moduleKey: "ads" },
      { title: "Social Media", url: "/social-media", icon: Share2, moduleKey: "social" },
      { title: "AI Visibility", url: "/ai-visibility", icon: Sparkles, moduleKey: "ai_visibility" },
      { title: "Tracking & Attribution", url: "/tracking-attribution", icon: Activity, moduleKey: "tracking" },
    ],
  },
  {
    title: "Communications",
    subtitle: "Templates, follow-ups, and forms.",
    icon: MessageSquare,
    items: [
      { title: "Inbox", url: "/conversations", icon: MessageSquare, moduleKey: "messaging" },
      { title: "Follow-Ups", url: "/follow-ups", icon: ListChecks, moduleKey: "crm" },
      { title: "Templates", url: "/message-templates", icon: FileText, moduleKey: "messaging" },
      { title: "Forms", url: "/forms", icon: FormInput, moduleKey: "forms" },
    ],
  },
  {
    title: "Client Overview",
    subtitle: "Performance and monitoring across your client base.",
    icon: ClipboardList,
    url: "/client-overview",
  },
  {
    title: "Team & Training",
    subtitle: "Everything about your team.",
    icon: Users,
    items: [
      { title: "Team", url: "/team", icon: Users, moduleKey: "team" },
      { title: "Staff Calendars", url: "/staff-calendars", icon: Calendar, moduleKey: "team" },
      { title: "Employee Performance", url: "/employee-performance", icon: TrendingUp, moduleKey: "team" },
      { title: "Training Center", url: "/training-center", icon: GraduationCap, moduleKey: "training" },
      { title: "Onboarding", url: "/sops", icon: Footprints, moduleKey: "training" },
    ],
  },
];

const FIELD_SERVICE_TYPES = [
  "hvac", "construction", "automotive", "window washing", "landscaping",
  "plumbing", "roofing", "cleaning service",
];

export function AppSidebar() {
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const { hasAccess } = useWorkspacePermissions();
  const { isAdmin, activeClientId } = useWorkspace();
  const [clientIndustry, setClientIndustry] = useState<string | null>(null);
  const [hasSalesTeam, setHasSalesTeam] = useState(false);

  useEffect(() => {
    if (!activeClientId) return;
    void (async () => {
      const { data } = await supabase
        .from("clients")
        .select("industry, has_sales_team")
        .eq("id", activeClientId)
        .maybeSingle();
      setClientIndustry(data?.industry?.toLowerCase() || null);
      setHasSalesTeam(Boolean((data as { has_sales_team?: boolean } | null)?.has_sales_team));
    })();
  }, [activeClientId]);

  const isFieldService = clientIndustry ? FIELD_SERVICE_TYPES.includes(clientIndustry) : false;
  const pathOnly = (url: string) => url.split("?")[0];
  const isActive = (url: string) => {
    const path = pathOnly(url);
    if (path === "/dashboard") return location.pathname === "/dashboard" || location.pathname === "/";
    if (url.includes("?view=companies")) return location.pathname === "/crm" && location.search.includes("view=companies");
    if (path === "/crm") return location.pathname === "/crm" && !location.search.includes("view=companies");
    return location.pathname.startsWith(path);
  };

  const canSee = (item: Pick<NavItem, "moduleKey" | "salesTeamOnly">) => {
    if (item.salesTeamOnly && !isAdmin && !hasSalesTeam) return false;
    if (!item.moduleKey || isAdmin) return true;
    if (item.moduleKey === "meeting_intel" && isFieldService) return false;
    return hasAccess(item.moduleKey, "view");
  };

  const [openModules, setOpenModules] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navStructure.map((module) => [
      module.title,
      Boolean(module.items?.some((item) => isActive(item.url))),
    ])),
  );

  useEffect(() => {
    const activeModule = navStructure.find((module) => module.items?.some((item) => isActive(item.url)));
    if (activeModule) setOpenModules((current) => ({ ...current, [activeModule.title]: true }));
  }, [location.pathname, location.search]);

  const NavItemLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.url);
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={collapsed ? item.title : undefined}
          className={`h-8 rounded-lg px-3 text-[12px] font-medium transition-colors ${
            active
              ? "bg-primary/10 font-semibold text-primary ring-1 ring-primary/20"
              : "text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          }`}
        >
          <Link to={item.url}>
            <item.icon className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="overflow-hidden border-r-0">
      <div className="sidebar-futuristic pointer-events-none absolute inset-0" />

      <SidebarHeader className="relative z-10 p-3">
        <div className="flex items-center justify-between px-2 py-1">
          <img
            src={newlightLogo}
            alt="NewLight"
            className={collapsed ? "mx-auto h-7 w-7 rounded-lg object-contain" : "h-8 w-auto rounded-lg object-contain"}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="relative z-10 px-2">
        {navStructure.map((module) => {
          const visibleItems = module.items?.filter(canSee) ?? [];
          if (module.items && visibleItems.length === 0) return null;
          const moduleActive = module.url ? isActive(module.url) : visibleItems.some((item) => isActive(item.url));

          if (module.url) {
            return (
              <SidebarGroup key={module.title} className="py-0.5">
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={moduleActive}
                        tooltip={collapsed ? module.title : undefined}
                        className={`h-auto min-h-11 rounded-lg px-3 py-2 ${moduleActive ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
                      >
                        <Link to={module.url} className="items-start">
                          <module.icon className="mt-0.5 h-4 w-4 shrink-0" />
                          {!collapsed && (
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold">{module.title}</span>
                              <span className="mt-0.5 block whitespace-normal text-[10px] font-normal leading-4 text-sidebar-foreground/45">{module.subtitle}</span>
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          const open = openModules[module.title] ?? false;
          return (
            <SidebarGroup key={module.title} className="py-0.5">
              {!collapsed && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpenModules((current) => ({ ...current, [module.title]: !open }))}
                  className={`h-auto min-h-11 w-full justify-start gap-2 rounded-lg px-3 py-2 text-left ${moduleActive ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
                  aria-expanded={open}
                >
                  <module.icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold">{module.title}</span>
                    <span className="mt-0.5 block whitespace-normal text-[10px] font-normal leading-4 text-sidebar-foreground/45">{module.subtitle}</span>
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`} />
                </Button>
              )}

              {(collapsed || open) && (
                <SidebarGroupContent className={collapsed ? "" : "mt-1 pl-2"}>
                  <SidebarMenu>
                    {visibleItems.map((item) => <NavItemLink key={`${item.title}-${item.url}`} item={item} />)}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="relative z-10 px-2 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={collapsed ? "Expand" : "Collapse"}
              className="h-8 rounded-lg px-3 text-[12px] font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <ChevronLeft className={`h-3.5 w-3.5 shrink-0 transition-transform ${collapsed ? "rotate-180" : ""}`} />
              {!collapsed && <span>Collapse</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
