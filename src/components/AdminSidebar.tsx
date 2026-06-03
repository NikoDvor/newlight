import { useLocation, Link } from "react-router-dom";
import {
  Users, ListChecks, ChevronLeft, Zap, Activity, Shield, LogOut, Hammer,
  Calendar, FileText, ChevronDown, Rocket, Brain,
  HeartPulse, TrendingUp, AlertTriangle, Wrench, Map, Trophy, Sparkles,
  LayoutDashboard, Contact, GitBranch, MessageSquare, Inbox as InboxIcon,
  FileSignature, Star, Share2, Search, Megaphone, Globe, Lightbulb,
  LineChart, PenSquare, Briefcase, Wallet, Plug, Settings as SettingsIcon
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter
} from "@/components/ui/sidebar";
import { useState } from "react";

interface NavGroup {
  label: string;
  items: { title: string; url: string; icon: any }[];
}

const navGroups: NavGroup[] = [
  {
    label: "Clients & Success",
    items: [
      { title: "Clients", url: "/admin/clients", icon: Users },
      { title: "Client Success", url: "/admin/client-success", icon: Shield },
      { title: "Provision Queue", url: "/admin/provision", icon: ListChecks },
      { title: "Onboarding Ops", url: "/admin/onboarding-command-center", icon: Rocket },
      { title: "Master Activation", url: "/admin/master-activation", icon: Zap },
      { title: "Demo Builds", url: "/admin/demo-builds", icon: Hammer },
    ],
  },
  {
    label: "Client Intelligence",
    items: [
      { title: "Client Health Scores", url: "/admin/client-intelligence/health", icon: HeartPulse },
      { title: "Revenue Growth Tracker", url: "/admin/client-intelligence/revenue", icon: TrendingUp },
      { title: "Priority Alerts", url: "/admin/client-intelligence/alerts", icon: AlertTriangle },
      { title: "Broken Setup Flags", url: "/admin/client-intelligence/setup-flags", icon: Wrench },
      { title: "Onboarding Progress", url: "/admin/client-intelligence/onboarding-progress", icon: Map },
      { title: "Win Tracking", url: "/admin/client-intelligence/wins", icon: Trophy },
      { title: "Optimization Flags", url: "/admin/client-intelligence/optimization", icon: Sparkles },
    ],
  },
  {
    label: "Team",
    items: [
      { title: "Team & Users", url: "/admin/team", icon: Shield },
    ],
  },
  {
    label: "Communications",
    items: [
      { title: "Conversations", url: "/admin/conversations", icon: Calendar },
      { title: "Follow-Up Queue", url: "/admin/follow-ups", icon: ListChecks },
      { title: "Message Templates", url: "/admin/message-templates", icon: FileText },
    ],
  },
  {
    label: "NewLight Ops",
    items: [
      { title: "Ops Dashboard", url: "/admin/ops/dashboard", icon: LayoutDashboard },
      { title: "CRM", url: "/admin/ops/crm", icon: Contact },
      { title: "Pipeline", url: "/admin/ops/pipeline", icon: GitBranch },
      { title: "Calendar", url: "/admin/ops/calendar", icon: Calendar },
      { title: "Conversations", url: "/admin/ops/conversations", icon: MessageSquare },
      { title: "Follow-Up Queue", url: "/admin/ops/follow-ups", icon: InboxIcon },
      { title: "Proposals", url: "/admin/ops/proposals", icon: FileSignature },
      { title: "Reviews", url: "/admin/ops/reviews", icon: Star },
      { title: "Social Media", url: "/admin/ops/social", icon: Share2 },
      { title: "SEO", url: "/admin/ops/seo", icon: Search },
      { title: "Paid Ads", url: "/admin/ops/ads", icon: Megaphone },
      { title: "Website", url: "/admin/ops/website", icon: Globe },
      { title: "AI Insights", url: "/admin/ops/ai-insights", icon: Lightbulb },
      { title: "Market Research", url: "/admin/ops/market-research", icon: LineChart },
      { title: "Content Planner", url: "/admin/ops/content", icon: PenSquare },
      { title: "Workforce", url: "/admin/ops/workforce", icon: Briefcase },
      { title: "Finance", url: "/admin/ops/finance", icon: Wallet },
      { title: "Integrations", url: "/admin/ops/integrations", icon: Plug },
      { title: "Settings", url: "/admin/ops/settings", icon: SettingsIcon },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const { signOut } = useWorkspace();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    navGroups.forEach((g) => {
      init[g.label] = g.items.some((i) => isActive(i.url));
    });
    // Always open first group
    init["Clients & Success"] = true;
    return init;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "linear-gradient(170deg, hsl(218 30% 14%) 0%, hsl(220 35% 10%) 50%, hsl(222 40% 8%) 100%)"
      }} />
      <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none opacity-30" style={{
        background: "radial-gradient(ellipse at 50% 0%, hsla(211,96%,60%,.4), transparent 70%)"
      }} />

      <SidebarHeader className="p-3 relative z-10">
        <div className="flex items-center justify-between px-2 py-1">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{
                background: "hsla(211,96%,60%,.2)",
                boxShadow: "0 0 20px -4px hsla(211,96%,60%,.35), inset 0 0 0 1px hsla(211,96%,60%,.15)"
              }}>
                <Zap className="h-4 w-4 text-[hsl(var(--nl-neon))] drop-shadow-[0_0_6px_hsla(211,96%,60%,.6)]" />
              </div>
              <div>
                <span className="font-bold text-[13px] tracking-tight text-white drop-shadow-[0_1px_2px_hsla(0,0%,0%,.15)]">NewLight</span>
                <span className="block text-[10px] text-white/40 font-medium">Admin Portal</span>
              </div>
            </div>
          ) : (
            <div className="h-8 w-8 rounded-xl flex items-center justify-center mx-auto" style={{
              background: "hsla(211,96%,60%,.2)",
              boxShadow: "0 0 20px -4px hsla(211,96%,60%,.35), inset 0 0 0 1px hsla(211,96%,60%,.15)"
            }}>
              <Zap className="h-4 w-4 text-[hsl(var(--nl-neon))] drop-shadow-[0_0_6px_hsla(211,96%,60%,.6)]" />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 relative z-10">
        {navGroups.map((group) => {
          const isOpen = openGroups[group.label] ?? false;
          return (
            <SidebarGroup key={group.label} className="py-0.5">
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/40 hover:text-white/60 transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
                </button>
              )}
              {(collapsed || isOpen) && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const active = isActive(item.url);
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            tooltip={collapsed ? item.title : undefined}
                            className={`h-8 px-3 rounded-xl text-[12px] font-medium transition-all duration-200 group ${
                              active
                                ? "text-white font-semibold"
                                : "text-white/60 hover:text-white hover:bg-white/[0.08]"
                            }`}
                            style={active ? {
                              background: "hsla(211,96%,60%,.18)",
                              boxShadow: "0 0 18px -4px hsla(211,96%,60%,.25), inset 0 0 0 1px hsla(211,96%,60%,.15)",
                            } : undefined}
                          >
                            <Link to={item.url}>
                              <item.icon className={`h-3.5 w-3.5 shrink-0 transition-all duration-200 ${
                                active
                                  ? "drop-shadow-[0_0_6px_hsla(211,96%,60%,.7)]"
                                  : "group-hover:drop-shadow-[0_0_5px_hsla(211,96%,60%,.4)] group-hover:scale-110"
                              }`} />
                              {!collapsed && <span>{item.title}</span>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="px-2 pb-3 relative z-10">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={collapsed ? "Expand" : "Collapse"}
              className="h-8 px-3 rounded-xl text-[12px] font-medium text-white/60 hover:text-white hover:bg-white/[0.08] transition-all duration-200 group"
            >
              <ChevronLeft className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover:scale-110 ${collapsed ? "rotate-180" : ""}`} />
              {!collapsed && <span>Collapse</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={signOut}
              tooltip={collapsed ? "Sign Out" : undefined}
              className="h-8 px-3 rounded-xl text-[12px] font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
