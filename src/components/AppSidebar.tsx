import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, Sparkles, Heart, DollarSign, ListChecks, Activity, Brain,
  Globe, Search, Megaphone, Share2, Users, Star, Settings2,
  TrendingUp, Eye, Calendar, Workflow, Plug, Image,
  GraduationCap, FileText, Settings, CreditCard,
  ChevronLeft, ChevronDown, Wallet, Mail, HelpCircle, HardHat,
  MessageSquare, Bell, Palette, PenTool, Headphones, BookOpen
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter
} from "@/components/ui/sidebar";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import newlightLogo from "@/assets/newlight-logo.jpg";
import { useWorkspacePermissions } from "@/hooks/useWorkspacePermissions";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface NavEntry {
  type: "item" | "group";
  title?: string;
  url?: string;
  icon?: any;
  label?: string;
  /** Module key for permission filtering. Omit = always visible. */
  moduleKey?: string;
  items?: { title: string; url: string; icon: any; moduleKey?: string }[];
}

const navStructure: NavEntry[] = [
  { type: "item", title: "Dashboard", url: "/", icon: LayoutDashboard },
  { type: "item", title: "AI Insights", url: "/ai-insights", icon: Sparkles, moduleKey: "ai" },
  { type: "item", title: "Growth Advisor", url: "/growth-advisor", icon: Brain, moduleKey: "ai" },
  {
    type: "group", label: "Client Overview",
    items: [
      { title: "Business Health", url: "/business-health", icon: Heart, moduleKey: "reports" },
      { title: "Revenue Opportunities", url: "/revenue-opportunities", icon: DollarSign, moduleKey: "reports" },
      { title: "Priority Actions", url: "/priority-actions", icon: ListChecks },
      { title: "Live Activity Feed", url: "/live-activity", icon: Activity },
    ],
  },
  {
    type: "group", label: "Growth Systems",
    items: [
      { title: "Website", url: "/website", icon: Globe, moduleKey: "website" },
      { title: "SEO", url: "/seo", icon: Search, moduleKey: "seo" },
      { title: "Ads", url: "/paid-ads", icon: Megaphone, moduleKey: "ads" },
      { title: "Social Media", url: "/social-media", icon: Share2, moduleKey: "social" },
      { title: "CRM", url: "/crm", icon: Users, moduleKey: "crm" },
      { title: "Reviews", url: "/reviews", icon: Star, moduleKey: "reviews" },
      { title: "Content Planner", url: "/content-planner", icon: Palette, moduleKey: "content" },
      { title: "Proposals", url: "/proposals", icon: PenTool, moduleKey: "proposals" },
    ],
  },
  {
    type: "group", label: "Communications",
    items: [
      { title: "Conversations", url: "/conversations", icon: MessageSquare, moduleKey: "messaging" },
      { title: "Inbox", url: "/inbox", icon: Mail, moduleKey: "messaging" },
      { title: "Follow-Up Queue", url: "/follow-ups", icon: ListChecks },
      { title: "Message Templates", url: "/message-templates", icon: FileText },
      { title: "Chat", url: "/chat", icon: MessageSquare, moduleKey: "messaging" },
    ],
  },
  {
    type: "group", label: "Enterprise Services",
    items: [
      { title: "Finance", url: "/finance", icon: Wallet, moduleKey: "finance" },
      { title: "Workforce", url: "/workforce", icon: HardHat, moduleKey: "workforce" },
      { title: "Team & Users", url: "/team", icon: Users, moduleKey: "settings" },
      { title: "Calendar", url: "/calendar", icon: Calendar, moduleKey: "calendar" },
      { title: "Manage Calendars", url: "/calendar-management", icon: Settings2, moduleKey: "calendar" },
      { title: "Forms", url: "/forms", icon: FileText, moduleKey: "forms" },
      { title: "Calendar Sync", url: "/calendar-integrations", icon: Plug, moduleKey: "calendar" },
      { title: "Email", url: "/email", icon: Mail, moduleKey: "email" },
      { title: "Notifications", url: "/notifications", icon: Bell },
    ],
  },
  {
    type: "group", label: "Business Intelligence",
    items: [
      { title: "Market Research", url: "/market-research", icon: TrendingUp, moduleKey: "reports" },
      { title: "Competitor Tracking", url: "/competitor-tracking", icon: Eye, moduleKey: "reports" },
      { title: "Meeting Intelligence", url: "/meeting-intelligence", icon: Calendar, moduleKey: "meeting_intel" },
      { title: "Automation Workflows", url: "/automations", icon: Workflow },
    ],
  },
  {
    type: "group", label: "Setup & Integrations",
    items: [
      { title: "Setup Center", url: "/setup-center", icon: Plug },
      { title: "Services & Products", url: "/services", icon: Settings2, moduleKey: "website" },
      { title: "Brand Assets", url: "/brand-assets", icon: Image },
      { title: "Integrations", url: "/integrations", icon: Plug, moduleKey: "settings" },
      { title: "Onboarding", url: "/onboarding", icon: Workflow },
    ],
  },
  {
    type: "group", label: "Training & Support",
    items: [
      { title: "Success Center", url: "/success-center", icon: Heart },
      { title: "Support Tickets", url: "/support-tickets", icon: Headphones, moduleKey: "helpdesk" },
      { title: "Knowledge Base", url: "/knowledge-base", icon: BookOpen },
      { title: "Help Desk", url: "/help-desk", icon: Headphones, moduleKey: "helpdesk" },
      { title: "Courses", url: "/training", icon: GraduationCap, moduleKey: "training" },
      { title: "How It Works", url: "/how-it-works", icon: HelpCircle },
    ],
  },
  { type: "item", title: "Reports", url: "/reports", icon: FileText, moduleKey: "reports" },
];

const bottomItems = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Billing", url: "/billing", icon: CreditCard },
];

// Field-service business types that don't need Zoom/meeting-intelligence
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

  // Load business type for meeting-intelligence visibility
  useEffect(() => {
    if (!activeClientId) return;
    (async () => {
      const { data } = await supabase
        .from("clients")
        .select("industry")
        .eq("id", activeClientId)
        .maybeSingle();
      setClientIndustry(data?.industry?.toLowerCase() || null);
    })();
  }, [activeClientId]);

  const isFieldService = clientIndustry ? FIELD_SERVICE_TYPES.includes(clientIndustry) : false;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const canSee = (moduleKey?: string) => {
    if (!moduleKey || isAdmin) return true;
    // Hide Zoom/meeting-intelligence for field-service business types
    if (moduleKey === "meeting_intel" && isFieldService) return false;
    return hasAccess(moduleKey, "view");
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    navStructure.forEach((entry) => {
      if (entry.type === "group" && entry.items) {
        init[entry.label!] = entry.items.some((i) => isActive(i.url));
      }
    });
    return init;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const NavItem = ({ item }: { item: { title: string; url: string; icon: any } }) => {
    const active = isActive(item.url);
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={collapsed ? item.title : undefined}
          className={`h-8 px-3 rounded-xl text-[12px] font-medium transition-all duration-200 group ${
            active
              ? "text-white font-semibold"
              : "text-white/70 hover:text-white hover:bg-white/[0.12]"
          }`}
          style={active ? {
            background: "hsla(0,0%,100%,.18)",
            boxShadow: "0 0 18px -4px hsla(0,0%,100%,.25), inset 0 0 0 1px hsla(0,0%,100%,.15)",
          } : undefined}
        >
          <Link to={item.url}>
            <item.icon className={`h-3.5 w-3.5 shrink-0 transition-all duration-200 ${
              active
                ? "drop-shadow-[0_0_6px_hsla(0,0%,100%,.7)]"
                : "group-hover:drop-shadow-[0_0_5px_hsla(0,0%,100%,.4)] group-hover:scale-110"
            }`} />
            {!collapsed && <span>{item.title}</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none sidebar-futuristic" />
      <div className="sidebar-glow-top absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, hsla(211,96%,60%,.12), transparent 70%)" }} />
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 100%, hsla(187,80%,55%,.06), transparent 70%)" }} />

      <SidebarHeader className="p-3 relative z-10">
        <div className="flex items-center justify-between px-2 py-1">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <img src={newlightLogo} alt="NewLight" className="h-8 w-auto object-contain rounded-lg" style={{ filter: "brightness(1.1) drop-shadow(0 0 8px hsla(0,0%,100%,.3))" }} />
            </div>
          ) : (
            <img src={newlightLogo} alt="NewLight" className="h-7 w-7 object-contain rounded-lg mx-auto" style={{ filter: "brightness(1.1) drop-shadow(0 0 8px hsla(0,0%,100%,.3))" }} />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 relative z-10">
        {navStructure.map((entry, idx) => {
          if (entry.type === "item") {
            if (!canSee(entry.moduleKey)) return null;
            return (
              <SidebarGroup key={idx} className="py-0.5">
                <SidebarGroupContent>
                  <SidebarMenu>
                    <NavItem item={entry as any} />
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          const group = entry as NavEntry & { items: any[] };
          const visibleItems = group.items!.filter(i => canSee(i.moduleKey));
          if (visibleItems.length === 0) return null;

          const isOpen = openGroups[group.label!] ?? false;

          return (
            <SidebarGroup key={idx} className="py-0.5">
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label!)}
                  className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/50 hover:text-white/70 transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
                </button>
              )}
              {(collapsed || isOpen) && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleItems.map((item: any) => (
                      <NavItem key={item.title} item={item} />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="px-2 pb-3 relative z-10">
        <SidebarMenu>
          {bottomItems.map((item) => (
            <NavItem key={item.title} item={item} />
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={collapsed ? "Expand" : "Collapse"}
              className="h-8 px-3 rounded-xl text-[12px] font-medium text-white/70 hover:text-white hover:bg-white/[0.12] transition-all duration-200 group"
            >
              <ChevronLeft className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${collapsed ? "rotate-180" : ""}`} />
              {!collapsed && <span>Collapse</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
