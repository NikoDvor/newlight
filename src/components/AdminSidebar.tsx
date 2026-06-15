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
  items?: { title: string; url: string; icon: any }[];
}

const navGroups: NavGroup[] = [
  {
    label: "Command Center",
    items: [
      { title: "Admin Dashboard", url: "/admin", icon: LayoutDashboard },
      { title: "Executive Dashboard", url: "/admin/executive", icon: Sparkles },
      { title: "Fix Now", url: "/admin/fix-now", icon: AlertTriangle },
    ],
  },
  {
    label: "Sales",
    items: [
      { title: "Sales Pipeline", url: "/admin/sales-pipeline", icon: GitBranch },
      { title: "Sales Control Center", url: "/admin/sales-control-center", icon: LayoutDashboard },
      { title: "Prospects", url: "/admin/prospects", icon: Contact },
      { title: "Meeting Intelligence", url: "/admin/meeting-intelligence", icon: MessageSquare },
      { title: "BDR Performance", url: "/admin/bdr-performance", icon: TrendingUp },
      { title: "Proposal Templates", url: "/admin/proposal-templates", icon: FileSignature },
      { title: "Sales Demo Creator", url: "/admin/sales-demo-creator", icon: Hammer },
    ],
  },
  {
    label: "Clients",
    items: [
      { title: "Client Accounts", url: "/admin/clients", icon: Users },
      { title: "Onboarding Ops", url: "/admin/onboarding-command-center", icon: Rocket },
      { title: "Client Activation", url: "/admin/activation", icon: Zap },
      { title: "Provision Queue", url: "/admin/provision", icon: ListChecks },
      { title: "Client Monitoring", url: "/admin/monitoring", icon: Activity },
      { title: "Client Success", url: "/admin/client-success", icon: Shield },
      { title: "Website Portfolio", url: "/admin/websites", icon: Globe },
    ],
  },
  {
    label: "Employee Hub",
    items: [
      { title: "Team & Users", url: "/admin/team", icon: Shield },
      { title: "Staff Calendars", url: "/admin/staff-calendars", icon: Calendar },
      { title: "Employee Performance", url: "/admin/employee-performance", icon: TrendingUp },
      { title: "Training Center", url: "/admin/training-center", icon: Brain },
      { title: "Training Health", url: "/admin/training-health", icon: HeartPulse },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { title: "Revenue Expansion", url: "/admin/revenue-expansion", icon: TrendingUp },
      { title: "Automations", url: "/admin/automations", icon: Activity },
      { title: "Audit Logs", url: "/admin/audit-logs", icon: FileText },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Reports", url: "/admin/reports", icon: LineChart },
      { title: "Billing", url: "/admin/billing", icon: Wallet },
      { title: "System Settings", url: "/admin/settings", icon: SettingsIcon },
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
      if (g.items) {
        init[g.label] = g.items.some((i) => isActive(i.url));
      }
    });
    // NewLight Ops and Growth Systems default open
    init["NewLight Ops"] = true;
    init["Growth Systems"] = true;
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

      <SidebarContent className="px-2 relative z-10 overflow-y-auto max-h-screen overscroll-contain">
        {navGroups.map((group) => {
          const isOpen = openGroups[group.label] ?? false;
          const isDivider = !group.items || group.items.length === 0;

          if (isDivider) {
            return (
              <SidebarGroup key={group.label} className="py-2">
                {!collapsed && (
                  <div className="flex items-center gap-2 px-3">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                )}
              </SidebarGroup>
            );
          }

          return (
            <SidebarGroup key={group.label} className="py-0.5">
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center justify-between w-full px-3 py-2.5 md:py-1.5 min-h-[44px] md:min-h-0 text-[10px] font-semibold uppercase tracking-widest text-white/40 hover:text-white/60 transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
                </button>
              )}
              {(collapsed || isOpen) && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items!.map((item) => {
                      const active = isActive(item.url);
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            tooltip={collapsed ? item.title : undefined}
                            className={`h-11 md:h-8 px-3 rounded-xl text-[13px] md:text-[12px] font-medium transition-all duration-200 group ${
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
